import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { ComprasRepository } from './compras.repository';

@Module({
  controllers: [ComprasController],
  providers: [ComprasService, ComprasRepository],
  exports: [ComprasService, ComprasRepository],
})
export class ComprasModule {}
