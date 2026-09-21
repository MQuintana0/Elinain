import { lastValueFrom, of } from 'rxjs';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { InterceptorContextoTenant } from '../../src/common/seguridad/interceptor-contexto-tenant';

describe('Flujo HTTP → AsyncLocalStorage tenant (MVP-007)', () => {
  it('transporta el usuario_id autenticado hasta el trabajo downstream', async () => {
    const contexto = new ContextoTenant();
    const interceptor = new InterceptorContextoTenant(contexto);
    const contextoHttp = {
      switchToHttp: () => ({ getRequest: () => ({ usuarioId: 'tenant-http-a' }) }),
    } as never;
    const siguiente = {
      handle: () => of(contexto.obtenerUsuarioId()),
    };

    await expect(lastValueFrom(interceptor.intercept(contextoHttp, siguiente))).resolves.toBe(
      'tenant-http-a',
    );
  });
});
