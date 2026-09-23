import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { obtenerExpiracionRefreshSegundos } from './acceso.config';
import { calcularHashToken, generarTokenRefrescoAleatorio } from './acceso.cripto';
import { AccesoRespuestaDto } from './dto/acceso-respuesta.dto';
import { CredencialesAccesoDto } from './dto/acceso-usuario.dto';
import { RefrescarTokenDto } from './dto/refrescar-token.dto';
import { CerrarSesionDto } from './dto/cerrar-sesion.dto';
import { SesionesRepository } from './sesiones.repository';
import { UsuariosRepository } from './usuarios.repository';

// Hash bcrypt válido (coste 10) usado solo como señuelo de temporización
// cuando el email no existe para evitar ataques de temporización.
const HASH_SENUELO_INEXISTENTE = '$2b$10$TdahXtB8smQmRvgEYu.x0.1DdoER2hmZvEWOss4iZcEtFpy.wJlFy';

@Injectable()
export class AccesoService {
  constructor(
    private readonly repositorio: UsuariosRepository,
    private readonly sesionesRepository: SesionesRepository,
    private readonly jwtService: JwtService,
  ) {}

  async iniciarSesion(
    dto: CredencialesAccesoDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AccesoRespuestaDto> {
    const fila = await this.repositorio.buscarPorEmail(dto.email);
    const valida = await bcrypt.compare(
      dto.password,
      fila?.password_hash ?? HASH_SENUELO_INEXISTENTE,
    );
    if (!fila || !valida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokenAcceso = await this.jwtService.signAsync({
      sub: fila.id,
      email: fila.email,
    });

    const tokenRefresco = generarTokenRefrescoAleatorio();
    const tokenHash = calcularHashToken(tokenRefresco);
    const familiaId = randomUUID();
    const expiraEn = new Date(
      Date.now() + obtenerExpiracionRefreshSegundos() * 1000,
    ).toISOString();

    await this.sesionesRepository.crear({
      usuario_id: fila.id,
      token_hash: tokenHash,
      familia_id: familiaId,
      expira_en: expiraEn,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    });

    return {
      tokenAcceso,
      tokenRefresco,
      usuario: { id: fila.id, nombre: fila.nombre, email: fila.email },
    };
  }

  async refrescar(
    dto: RefrescarTokenDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AccesoRespuestaDto> {
    const tokenHash = calcularHashToken(dto.tokenRefresco);
    const sesion = await this.sesionesRepository.buscarPorTokenHash(tokenHash);

    if (!sesion) {
      throw new UnauthorizedException('Token de refresco inválido o no encontrado');
    }

    // Detección de reutilización (Token Reuse Detection):
    // Si un token ya revocado intenta refrescarse, se asume robo de token y se revoca toda la familia.
    if (sesion.revocado) {
      await this.sesionesRepository.revocarFamiliaPorReuso(sesion.usuario_id, sesion.familia_id);
      throw new UnauthorizedException('Sesión revocada por detección de reutilización');
    }

    const ahora = Date.now();
    const tiempoExpiracion = new Date(sesion.expira_en).getTime();
    if (tiempoExpiracion <= ahora) {
      throw new UnauthorizedException('Token de refresco expirado');
    }

    const usuario = await this.repositorio.buscarPorId(sesion.usuario_id);
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const nuevoTokenRefresco = generarTokenRefrescoAleatorio();
    const nuevoTokenHash = calcularHashToken(nuevoTokenRefresco);
    const nuevaExpiraEn = new Date(
      ahora + obtenerExpiracionRefreshSegundos() * 1000,
    ).toISOString();

    await this.sesionesRepository.rotarSesion({
      sesionActualId: sesion.id,
      usuario_id: sesion.usuario_id,
      familia_id: sesion.familia_id,
      nuevo_token_hash: nuevoTokenHash,
      nueva_expira_en: nuevaExpiraEn,
      ip: ip ?? null,
      user_agent: userAgent ?? null,
    });

    const nuevoTokenAcceso = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });

    return {
      tokenAcceso: nuevoTokenAcceso,
      tokenRefresco: nuevoTokenRefresco,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    };
  }

  async cerrarSesion(dto: CerrarSesionDto): Promise<{ exito: boolean; mensaje: string }> {
    const tokenHash = calcularHashToken(dto.tokenRefresco);
    await this.sesionesRepository.revocarPorTokenHash(tokenHash, 'logout');
    return { exito: true, mensaje: 'Sesión cerrada correctamente' };
  }
}
