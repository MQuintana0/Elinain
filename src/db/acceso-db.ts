import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { crearConexionDb, type ConexionDb, type TrabajoTransaccional } from './conexion';

@Injectable()
export class AccesoDb implements OnApplicationShutdown {
  private conexion?: ConexionDb;

  obtenerConexion(): ConexionDb {
    if (!this.conexion) {
      const url =
        process.env.DATABASE_URL ??
        'postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain';
      this.conexion = crearConexionDb(url);
    }
    return this.conexion;
  }

  ejecutarConTenant<T>(trabajo: TrabajoTransaccional<T>): Promise<T> {
    return this.obtenerConexion().ejecutarConTenant(trabajo);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.conexion?.cerrar();
    this.conexion = undefined;
  }
}
