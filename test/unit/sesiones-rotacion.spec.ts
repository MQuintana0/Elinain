/* eslint-disable @typescript-eslint/unbound-method */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccesoService } from '../../src/usuarios/acceso.service';
import { SesionesRepository } from '../../src/usuarios/sesiones.repository';
import { UsuariosRepository } from '../../src/usuarios/usuarios.repository';
import { calcularHashToken } from '../../src/usuarios/acceso.cripto';

describe('Rotación de Sesiones y Detección de Reuso (REFRESH-004)', () => {
  let servicio: AccesoService;
  let usuariosRepo: jest.Mocked<UsuariosRepository>;
  let sesionesRepo: jest.Mocked<SesionesRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const usuarioMock = {
    id: 'user-uuid-1',
    nombre: 'Comerciante Ganadero',
    email: 'ganadero@elinain.com',
    password_hash: '',
  };

  beforeAll(async () => {
    usuarioMock.password_hash = await bcrypt.hash('ContrasenaSegura123', 10);
  });

  beforeEach(() => {
    usuariosRepo = {
      buscarPorEmail: jest.fn(),
      buscarPorId: jest.fn(),
      crear: jest.fn(),
    } as unknown as jest.Mocked<UsuariosRepository>;

    sesionesRepo = {
      crear: jest.fn(),
      buscarPorTokenHash: jest.fn(),
      rotarSesion: jest.fn(),
      revocarFamiliaPorReuso: jest.fn(),
      revocarPorTokenHash: jest.fn(),
    } as unknown as jest.Mocked<SesionesRepository>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt_mock_token_123'),
    } as unknown as jest.Mocked<JwtService>;

    servicio = new AccesoService(usuariosRepo, sesionesRepo, jwtService);
  });

  describe('iniciarSesion', () => {
    it('emite token de acceso, token de refresco y persiste la sesión inicial', async () => {
      usuariosRepo.buscarPorEmail.mockResolvedValue(usuarioMock);
      sesionesRepo.crear.mockResolvedValue({
        id: 'sesion-1',
        usuario_id: usuarioMock.id,
        token_hash: 'hash-1',
        familia_id: 'familia-1',
        reemplazado_por: null,
        revocado: false,
        revocado_en: null,
        revocado_motivo: null,
        creado_en: new Date().toISOString(),
        expira_en: new Date(Date.now() + 604800000).toISOString(),
        ip: null,
        user_agent: null,
      });

      const respuesta = await servicio.iniciarSesion({
        email: 'ganadero@elinain.com',
        password: 'ContrasenaSegura123',
      });

      expect(respuesta.tokenAcceso).toBe('jwt_mock_token_123');
      expect(typeof respuesta.tokenRefresco).toBe('string');
      expect(respuesta.tokenRefresco.length).toBe(128);
      expect(respuesta.usuario.id).toBe(usuarioMock.id);
      expect(sesionesRepo.crear).toHaveBeenCalledTimes(1);
      const llamadaCrear = sesionesRepo.crear.mock.calls[0][0];
      expect(llamadaCrear.usuario_id).toBe(usuarioMock.id);
      expect(llamadaCrear.token_hash).toBe(calcularHashToken(respuesta.tokenRefresco));
      expect(llamadaCrear.familia_id).toBeDefined();
    });

    it('rechaza credenciales inválidas sin persistir sesión', async () => {
      usuariosRepo.buscarPorEmail.mockResolvedValue(usuarioMock);

      await expect(
        servicio.iniciarSesion({
          email: 'ganadero@elinain.com',
          password: 'PasswordIncorrecto',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(sesionesRepo.crear).not.toHaveBeenCalled();
    });
  });

  describe('refrescar', () => {
    const tokenValido = 'a'.repeat(128);
    const tokenHashValido = calcularHashToken(tokenValido);
    const sesionActiva = {
      id: 'sesion-activa-uuid',
      usuario_id: usuarioMock.id,
      token_hash: tokenHashValido,
      familia_id: 'familia-uuid-1',
      reemplazado_por: null,
      revocado: false,
      revocado_en: null,
      revocado_motivo: null,
      creado_en: new Date().toISOString(),
      expira_en: new Date(Date.now() + 604800000).toISOString(),
      ip: null,
      user_agent: null,
    };

    it('rota exitosamente un refresh token válido entregando un nuevo par', async () => {
      sesionesRepo.buscarPorTokenHash.mockResolvedValue(sesionActiva);
      usuariosRepo.buscarPorId.mockResolvedValue(usuarioMock);
      sesionesRepo.rotarSesion.mockResolvedValue({
        ...sesionActiva,
        id: 'nueva-sesion-uuid',
        reemplazado_por: sesionActiva.id,
      });

      const respuesta = await servicio.refrescar({ tokenRefresco: tokenValido });

      expect(respuesta.tokenAcceso).toBe('jwt_mock_token_123');
      expect(respuesta.tokenRefresco).not.toBe(tokenValido);
      expect(sesionesRepo.rotarSesion).toHaveBeenCalledWith(
        expect.objectContaining({
          sesionActualId: sesionActiva.id,
          usuario_id: usuarioMock.id,
          familia_id: sesionActiva.familia_id,
        }),
      );
    });

    it('falla con 401 si el token no existe', async () => {
      sesionesRepo.buscarPorTokenHash.mockResolvedValue(undefined);

      await expect(
        servicio.refrescar({ tokenRefresco: 'token_inexistente_12345678901234567890' }),
      ).rejects.toThrow('Token de refresco inválido o no encontrado');
    });

    it('falla con 401 si el token expiró', async () => {
      sesionesRepo.buscarPorTokenHash.mockResolvedValue({
        ...sesionActiva,
        expira_en: new Date(Date.now() - 1000).toISOString(),
      });

      await expect(servicio.refrescar({ tokenRefresco: tokenValido })).rejects.toThrow(
        'Token de refresco expirado',
      );
      expect(sesionesRepo.rotarSesion).not.toHaveBeenCalled();
    });

    it('detecta reutilización si el token ya estaba revocado y revoca toda la familia', async () => {
      sesionesRepo.buscarPorTokenHash.mockResolvedValue({
        ...sesionActiva,
        revocado: true,
        revocado_motivo: 'rotacion',
      });

      await expect(servicio.refrescar({ tokenRefresco: tokenValido })).rejects.toThrow(
        'Sesión revocada por detección de reutilización',
      );

      expect(sesionesRepo.revocarFamiliaPorReuso).toHaveBeenCalledWith(
        sesionActiva.usuario_id,
        sesionActiva.familia_id,
      );
      expect(sesionesRepo.rotarSesion).not.toHaveBeenCalled();
    });
  });

  describe('cerrarSesion', () => {
    it('revoca la sesión por su hash con motivo logout', async () => {
      sesionesRepo.revocarPorTokenHash.mockResolvedValue(true);

      const res = await servicio.cerrarSesion({
        tokenRefresco: 'token_a_cerrar_12345678901234567890',
      });
      expect(res.exito).toBe(true);
      expect(sesionesRepo.revocarPorTokenHash).toHaveBeenCalledWith(
        calcularHashToken('token_a_cerrar_12345678901234567890'),
        'logout',
      );
    });
  });
});
