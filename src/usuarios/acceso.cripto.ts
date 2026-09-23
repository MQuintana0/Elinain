import { createHash, randomBytes } from 'node:crypto';

/**
 * Genera un token de refresco opaco criptográficamente seguro de 64 bytes (128 caracteres hex).
 */
export function generarTokenRefrescoAleatorio(): string {
  return randomBytes(64).toString('hex');
}

/**
 * Calcula el hash SHA-256 de un token en texto plano para persistencia y búsqueda segura.
 */
export function calcularHashToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}
