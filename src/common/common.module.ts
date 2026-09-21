import { Global, Module } from '@nestjs/common';
import { ContextoTenant } from './seguridad/contexto-tenant';

@Global()
@Module({
  providers: [ContextoTenant],
  exports: [ContextoTenant],
})
export class CommonModule {}
