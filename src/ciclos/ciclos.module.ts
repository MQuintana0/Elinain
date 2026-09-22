import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { CiclosController } from './ciclos.controller';
import { CiclosRepository } from './ciclos.repository';
import { CiclosService } from './ciclos.service';

@Module({
  imports: [DbModule],
  controllers: [CiclosController],
  providers: [CiclosRepository, CiclosService],
  exports: [CiclosService, CiclosRepository],
})
export class CiclosModule {}
