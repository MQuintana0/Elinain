import { Module } from '@nestjs/common';
import { UtilidadService } from './utilidad.service';
import { VentasRepository } from './ventas.repository';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';

@Module({
  controllers: [VentasController],
  providers: [UtilidadService, VentasRepository, VentasService],
  exports: [UtilidadService, VentasRepository, VentasService],
})
export class VentasModule {}
