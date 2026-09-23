// Módulo usuarios/ (MVP-005 registro + MVP-006 acceso JWT, H1).
// Patrón Controlador -> Servicio -> Repositorio -> Drizzle.
// JWT directo sin passport: una sola dependencia (@nestjs/jwt) basta para
// firmar y verificar; passport añadiría estrategia y adaptadores sin
// comportamiento extra que este MVP necesite.
// Rutas PÚBLICAS por necesidad: registro y acceso emiten la identidad;
// MVP-007 (TenantGuard global) cerrará el resto de rutas.
import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccesoGuard } from './acceso.guard';
import { obtenerExpiracionJwt, obtenerSecretoJwt } from './acceso.config';
import { AccesoService } from './acceso.service';
import { UsuariosController } from './usuarios.controller';
import { AccesoBdUsuarios, BD_USUARIOS } from './usuarios.db';
import { SesionesRepository } from './sesiones.repository';
import { UsuariosRepository } from './usuarios.repository';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [
    JwtModule.register({
      secret: obtenerSecretoJwt(),
      signOptions: { expiresIn: obtenerExpiracionJwt() },
    }),
  ],
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    AccesoService,
    AccesoGuard,
    UsuariosRepository,
    SesionesRepository,
    { provide: BD_USUARIOS, useClass: AccesoBdUsuarios },
  ],
  exports: [UsuariosService, AccesoService, AccesoGuard, JwtModule, SesionesRepository],
})
export class UsuariosModule implements OnApplicationShutdown {
  constructor(@Inject(BD_USUARIOS) private readonly bd: AccesoBdUsuarios) {}

  async onApplicationShutdown(): Promise<void> {
    await this.bd.cerrar();
  }
}
