import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export const almacenamientoTenant = new AsyncLocalStorage<string>();

export function obtenerUsuarioIdTenantActual(): string | undefined {
  return almacenamientoTenant.getStore();
}

@Injectable()
export class ContextoTenant {
  ejecutar<T>(usuarioId: string, trabajo: () => T): T {
    return almacenamientoTenant.run(usuarioId, trabajo);
  }

  obtenerUsuarioId(): string | undefined {
    return obtenerUsuarioIdTenantActual();
  }
}
