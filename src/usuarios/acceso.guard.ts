// Guard de acceso JWT (MVP-006, H1).
// Verifica el esquema `Bearer <token>` con JwtService: firma inválida,
// token expirado o ausente responden 401 en español. En éxito adjunta
// `peticion.usuario = { id, email }` para los controladores.
// Alcance: guard LOCAL del módulo usuarios/, usado por la sonda de prueba.
// NO se instala globalmente: el TenantGuard global es MVP-007.
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface UsuarioAutenticado {
  id: string;
  email: string;
}

export interface PeticionConUsuario extends Request {
  usuario?: UsuarioAutenticado;
}

@Injectable()
export class AccesoGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<PeticionConUsuario>();
    const autorizacion = peticion.headers.authorization;
    const partesAutorizacion = autorizacion?.trim().split(/\s+/) ?? [];
    const [esquema, token] = partesAutorizacion;
    if (partesAutorizacion.length !== 2 || esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }
    try {
      const carga = await this.jwtService.verifyAsync<{
        sub?: unknown;
        email?: unknown;
      }>(token);
      if (typeof carga.sub !== 'string' || typeof carga.email !== 'string') {
        throw new UnauthorizedException('Token inválido o expirado');
      }
      peticion.usuario = { id: carga.sub, email: carga.email };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
