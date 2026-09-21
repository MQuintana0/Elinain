import { Global, Module } from '@nestjs/common';
import { AccesoDb } from './acceso-db';

@Global()
@Module({
  providers: [AccesoDb],
  exports: [AccesoDb],
})
export class DbModule {}
