import { Module } from '@nestjs/common';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TercerosModule } from './terceros/terceros.module';
import { FincasModule } from './fincas/fincas.module';
import { ContratosModule } from './contratos/contratos.module';
import { ComprasModule } from './compras/compras.module';
import { VentasModule } from './ventas/ventas.module';
import { CiclosModule } from './ciclos/ciclos.module';
import { CostosModule } from './costos/costos.module';
import { ReportesModule } from './reportes/reportes.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    UsuariosModule,
    TercerosModule,
    FincasModule,
    ContratosModule,
    ComprasModule,
    VentasModule,
    CiclosModule,
    CostosModule,
    ReportesModule,
  ],
})
export class AppModule {}
