import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { defer } from 'rxjs';
import { ContextoTenant } from './contexto-tenant';
import type { PeticionConUsuario } from '../../usuarios/acceso.guard';

@Injectable()
export class InterceptorContextoTenant implements NestInterceptor {
  constructor(private readonly contexto: ContextoTenant) {}

  intercept(contextoHttp: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const peticion = contextoHttp.switchToHttp().getRequest<PeticionConUsuario>();
    const usuarioId = peticion.usuarioId;
    if (!usuarioId) {
      return siguiente.handle();
    }
    return defer(() => this.contexto.ejecutar(usuarioId, () => siguiente.handle()));
  }
}
