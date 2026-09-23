// Configuración JWT del acceso (MVP-006, H1).
// El secreto NUNCA se hardcodea: en producción se exige JWT_SECRETO. En
// desarrollo/pruebas se genera un secreto efímero para no comprometer
// credenciales en el repositorio; los tokens se invalidan al reiniciar.
// La expiración se lee de JWT_EXPIRA
// (p. ej. '3600s', '1h') con defecto de 3600 segundos (1 hora).
import { randomBytes } from 'node:crypto';
import type { JwtSignOptions } from '@nestjs/jwt';

const EXPIRACION_JWT_DEFECTO_SEGUNDOS = 900; // 15 minutos
const EXPIRACION_REFRESH_DEFECTO_SEGUNDOS = 604800; // 7 días

export function obtenerSecretoJwt(): string {
  const secreto = process.env.JWT_SECRETO?.trim();
  if (secreto) {
    return secreto;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRETO es obligatorio en producción');
  }
  return randomBytes(32).toString('hex');
}

export function obtenerExpiracionJwt(): JwtSignOptions['expiresIn'] {
  const cruda = process.env.JWT_EXPIRA?.trim();
  if (!cruda) {
    return EXPIRACION_JWT_DEFECTO_SEGUNDOS;
  }
  const comoNumero = Number(cruda);
  if (Number.isInteger(comoNumero) && comoNumero > 0) {
    return comoNumero;
  }
  // Formatos de texto ('15m', '1h', '3600s', '7d'): los valida jsonwebtoken al
  // firmar; un valor inválido lanza error en el login, nunca un token raro.
  return cruda as JwtSignOptions['expiresIn'];
}

export function obtenerExpiracionRefreshSegundos(): number {
  const cruda = process.env.JWT_REFRESH_EXPIRA?.trim();
  if (!cruda) {
    return EXPIRACION_REFRESH_DEFECTO_SEGUNDOS;
  }
  const comoNumero = Number(cruda);
  if (Number.isInteger(comoNumero) && comoNumero > 0) {
    return comoNumero;
  }
  return EXPIRACION_REFRESH_DEFECTO_SEGUNDOS;
}
