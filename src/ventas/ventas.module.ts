import { Module } from '@nestjs/common';
import { UtilidadService } from './utilidad.service';

@Module({
  providers: [UtilidadService],
  exports: [UtilidadService],
})
export class VentasModule {}
