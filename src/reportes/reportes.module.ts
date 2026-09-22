import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ReportesController } from './reportes.controller';
import { ReportesRepository } from './reportes.repository';
import { ReportesService } from './reportes.service';

@Module({
  imports: [DbModule],
  controllers: [ReportesController],
  providers: [ReportesRepository, ReportesService],
  exports: [ReportesService, ReportesRepository],
})
export class ReportesModule {}
