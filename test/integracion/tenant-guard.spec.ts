import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { HealthController } from '../../src/health/health.controller';
import { AccesoGuard, type PeticionConUsuario } from '../../src/usuarios/acceso.guard';
import { TenantGuard } from '../../src/common/seguridad/tenant.guard';
import { UsuariosController } from '../../src/usuarios/usuarios.controller';

function contextoDe(
  handler: (...argumentos: never[]) => unknown,
  clase: new (...argumentos: never[]) => unknown,
  peticion: Partial<PeticionConUsuario>,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => peticion }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard global (MVP-007)', () => {
  const jwt = new JwtService({ secret: 'secreto-pruebas-mvp007' });
  const guard = new TenantGuard(new Reflector(), new AccesoGuard(jwt));

  it('rechaza sin JWT una ruta de dominio no marcada como pública', async () => {
    const contexto = contextoDe(() => undefined, class RutaDeDominio {}, { headers: {} });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('extrae usuario_id del JWT y lo inyecta en la petición protegida', async () => {
    const usuarioId = '8f3d2c5e-0d17-4ad7-90f2-8fd579b5e1ca';
    const peticion: Partial<PeticionConUsuario> = {
      headers: {
        authorization: `Bearer ${jwt.sign({ sub: usuarioId, email: 'tenant-a@ejemplo.com' })}`,
      },
    };
    const contexto = contextoDe(() => undefined, class RutaDeDominio {}, peticion);

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(peticion.usuarioId).toBe(usuarioId);
    expect(peticion.usuario?.id).toBe(usuarioId);
  });

  it('solo deja sin JWT los handlers marcados explícitamente como públicos', async () => {
    const registro = contextoDe(
      // El handler original conserva la metadata; bind() la perdería.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      UsuariosController.prototype.registrar,
      UsuariosController,
      { headers: {} },
    );
    const health = contextoDe(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      HealthController.prototype.verificar,
      HealthController,
      { headers: {} },
    );

    await expect(guard.canActivate(registro)).resolves.toBe(true);
    await expect(guard.canActivate(health)).resolves.toBe(true);
  });
});
