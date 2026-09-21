import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TercerosModule } from './terceros/terceros.module';
import { FincasModule } from './fincas/fincas.module';
import { ContratosModule } from './contratos/contratos.module';
import { ComprasModule } from './compras/compras.module';
import { VentasModule } from './ventas/ventas.module';
import { CiclosModule } from './ciclos/ciclos.module';
import { CostosModule } from './costos/costos.module';
import { ReportesModule } from './reportes/reportes.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { DbModule } from './db/db.module';
import { InterceptorContextoTenant } from './common/seguridad/interceptor-contexto-tenant';
import { TenantGuard } from './common/seguridad/tenant.guard';

@Module({
  imports: [
    CommonModule,
    DbModule,
    UsuariosModule,
    TercerosModule,
    FincasModule,
    ContratosModule,
    ComprasModule,
    VentasModule,
    CiclosModule,
    CostosModule,
    ReportesModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_INTERCEPTOR, useClass: InterceptorContextoTenant },
  ],
})
export class AppModule {}
