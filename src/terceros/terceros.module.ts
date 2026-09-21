import { Module } from '@nestjs/common';
import { TercerosController } from './terceros.controller';
import { TercerosRepository } from './terceros.repository';
import { TercerosService } from './terceros.service';

@Module({
  controllers: [TercerosController],
  providers: [TercerosService, TercerosRepository],
  exports: [TercerosService, TercerosRepository],
})
export class TercerosModule {}
