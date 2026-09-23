import {
  obtenerExpiracionJwt,
  obtenerExpiracionRefreshSegundos,
  obtenerSecretoJwt,
} from '../../src/usuarios/acceso.config';
import { calcularHashToken, generarTokenRefrescoAleatorio } from '../../src/usuarios/acceso.cripto';

describe('Configuración y Criptografía de Acceso (REFRESH-003)', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...envOriginal };
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it('obtiene el secreto JWT configurado o genera uno efímero en desarrollo', () => {
    process.env.JWT_SECRETO = 'secreto_super_seguro_test_123';
    expect(obtenerSecretoJwt()).toBe('secreto_super_seguro_test_123');

    delete process.env.JWT_SECRETO;
    process.env.NODE_ENV = 'development';
    const efimero = obtenerSecretoJwt();
    expect(typeof efimero).toBe('string');
    expect(efimero.length).toBe(64);
  });

  it('falla si no hay JWT_SECRETO en producción', () => {
    delete process.env.JWT_SECRETO;
    process.env.NODE_ENV = 'production';
    expect(() => obtenerSecretoJwt()).toThrow('JWT_SECRETO es obligatorio en producción');
  });

  it('devuelve 900s (15 min) por defecto para el access token', () => {
    delete process.env.JWT_EXPIRA;
    expect(obtenerExpiracionJwt()).toBe(900);

    process.env.JWT_EXPIRA = '1800';
    expect(obtenerExpiracionJwt()).toBe(1800);

    process.env.JWT_EXPIRA = '30m';
    expect(obtenerExpiracionJwt()).toBe('30m');
  });

  it('devuelve 604800s (7 días) por defecto para el refresh token', () => {
    delete process.env.JWT_REFRESH_EXPIRA;
    expect(obtenerExpiracionRefreshSegundos()).toBe(604800);

    process.env.JWT_REFRESH_EXPIRA = '86400';
    expect(obtenerExpiracionRefreshSegundos()).toBe(86400);

    process.env.JWT_REFRESH_EXPIRA = 'invalido';
    expect(obtenerExpiracionRefreshSegundos()).toBe(604800);
  });

  it('genera tokens de refresco de 128 caracteres hexadecimales con entropía', () => {
    const token1 = generarTokenRefrescoAleatorio();
    const token2 = generarTokenRefrescoAleatorio();
    expect(token1.length).toBe(128);
    expect(token2.length).toBe(128);
    expect(token1).not.toBe(token2);
  });

  it('calcula hashes SHA-256 consistentes y normalizados', () => {
    const token = 'token_de_prueba_123';
    const hash1 = calcularHashToken(token);
    const hash2 = calcularHashToken(`  ${token}  `);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
