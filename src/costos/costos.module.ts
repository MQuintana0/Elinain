import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { CostosController } from './costos.controller';
import { CostosRepository } from './costos.repository';
import { CostosService } from './costos.service';

@Module({
  imports: [DbModule],
  controllers: [CostosController],
  providers: [CostosRepository, CostosService],
  exports: [CostosService, CostosRepository],
})
export class CostosModule {}
