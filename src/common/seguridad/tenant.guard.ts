import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccesoGuard } from '../../usuarios/acceso.guard';
import { RUTA_PUBLICA_METADATA } from './ruta-publica.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accesoGuard: AccesoGuard,
  ) {}

  canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride<boolean>(RUTA_PUBLICA_METADATA, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublica === true) {
      return Promise.resolve(true);
    }
    return Promise.resolve(this.accesoGuard.canActivate(contexto));
  }
}
