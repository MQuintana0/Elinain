import { Module } from '@nestjs/common';
import { FincasController } from './fincas.controller';
import { FincasRepository } from './fincas.repository';
import { FincasService } from './fincas.service';

@Module({
  controllers: [FincasController],
  providers: [FincasService, FincasRepository],
  exports: [FincasService, FincasRepository],
})
export class FincasModule {}
