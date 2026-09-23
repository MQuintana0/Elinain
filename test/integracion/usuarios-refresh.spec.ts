import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { crearConexionDb } from '../../src/db/conexion';
import { usuarios } from '../../src/db/schema/usuarios';
import { sesiones } from '../../src/db/schema/sesiones';

process.env.JWT_SECRETO ??= 'secreto-pruebas-refresh-tokens-dev';

const urlConexion =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';
const prefijoEmail = `refresh-int-${Date.now()}-`;
let contador = 0;

function nuevoEmail(): string {
  contador += 1;
  return `${prefijoEmail}${contador}@ejemplo.com`;
}

interface DatosAcceso {
  tokenAcceso: string;
  tokenRefresco: string;
  usuario: { id: string; nombre: string; email: string };
}

interface CuerpoRespuesta<T> {
  exito: boolean;
  datos: T;
  mensaje?: string;
  codigoEstado?: number;
}

describe('Flujo de Refresh Tokens, Rotación y Detección de Reuso (REFRESH-008)', () => {
  let app: INestApplication;
  const correosCreados: string[] = [];

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new FiltroExcepcionesHttp());
    app.useGlobalInterceptors(new InterceptorRegistroPeticion(), new InterceptorFormatoRespuesta());
    app.setGlobalPrefix('api/v1', { exclude: ['docs', 'referencia'] });
    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    const conexion = crearConexionDb(urlConexion);
    try {
      for (const email of correosCreados) {
        const filas = await conexion.db.select().from(usuarios).where(eq(usuarios.email, email));
        if (filas[0]) {
          await conexion.db.delete(sesiones).where(eq(sesiones.usuario_id, filas[0].id));
          await conexion.db.delete(usuarios).where(eq(usuarios.id, filas[0].id));
        }
      }
    } finally {
      await conexion.cerrar();
    }
    await app?.close();
  });

  async function registrar(email: string): Promise<void> {
    const url = await app.getUrl();
    const res = await fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Comerciante Refresh',
        email,
        password: 'PasswordSeguro123',
      }),
    });
    expect(res.status).toBe(201);
    correosCreados.push(email);
  }

  async function acceder(email: string): Promise<DatosAcceso> {
    const url = await app.getUrl();
    const res = await fetch(`${url}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'PasswordSeguro123' }),
    });
    expect(res.status).toBe(200);
    const cuerpo = (await res.json()) as CuerpoRespuesta<DatosAcceso>;
    return cuerpo.datos;
  }

  async function refrescar(tokenRefresco: string): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/usuarios/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenRefresco }),
    });
  }

  async function cerrarSesion(tokenRefresco: string): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/usuarios/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenRefresco }),
    });
  }

  async function consultarRutaProtegida(tokenAcceso: string): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/terceros`, {
      headers: { Authorization: `Bearer ${tokenAcceso}` },
    });
  }

  it('permite renovar tokens con éxito y usar el nuevo access token en rutas protegidas', async () => {
    const email = nuevoEmail();
    await registrar(email);
    const sesionInicial = await acceder(email);

    expect(typeof sesionInicial.tokenAcceso).toBe('string');
    expect(typeof sesionInicial.tokenRefresco).toBe('string');
    expect(sesionInicial.tokenRefresco.length).toBe(128);

    // 1. Verificar acceso con el access token inicial a ruta protegida con TenantGuard
    const prueba1 = await consultarRutaProtegida(sesionInicial.tokenAcceso);
    expect(prueba1.status).toBe(200);

    // 2. Renovar mediante POST /usuarios/refresh
    const resRefresh = await refrescar(sesionInicial.tokenRefresco);
    expect(resRefresh.status).toBe(200);
    const cuerpoRefresh = (await resRefresh.json()) as CuerpoRespuesta<DatosAcceso>;

    expect(cuerpoRefresh.exito).toBe(true);
    expect(cuerpoRefresh.datos.tokenAcceso).toBeDefined();
    expect(cuerpoRefresh.datos.tokenRefresco).toBeDefined();
    expect(cuerpoRefresh.datos.tokenRefresco).not.toBe(sesionInicial.tokenRefresco);

    // 3. El nuevo token de acceso es plenamente válido en rutas protegidas
    const prueba2 = await consultarRutaProtegida(cuerpoRefresh.datos.tokenAcceso);
    expect(prueba2.status).toBe(200);
  });

  it('detecta reutilización de un refresh token previo y revoca toda la familia de sesiones', async () => {
    const email = nuevoEmail();
    await registrar(email);
    const sesion1 = await acceder(email);

    // Primera rotación legítima: sesion1 -> sesion2
    const resRotacion = await refrescar(sesion1.tokenRefresco);
    expect(resRotacion.status).toBe(200);
    const sesion2 = ((await resRotacion.json()) as CuerpoRespuesta<DatosAcceso>).datos;

    // ATAQUE / REUSO: Un atacante intenta usar sesion1.tokenRefresco que ya fue rotado
    const intentoAtaque = await refrescar(sesion1.tokenRefresco);
    expect(intentoAtaque.status).toBe(401);
    const cuerpoAtaque = (await intentoAtaque.json()) as { mensaje: string };
    expect(cuerpoAtaque.mensaje).toContain('reutilización');

    // Consecuencia del protocolo de seguridad: sesion2 también debe haber sido invalidada
    const intentoPostAtaque = await refrescar(sesion2.tokenRefresco);
    expect(intentoPostAtaque.status).toBe(401);
  });

  it('logout invalida el refresh token de forma inmediata', async () => {
    const email = nuevoEmail();
    await registrar(email);
    const sesion = await acceder(email);

    const resLogout = await cerrarSesion(sesion.tokenRefresco);
    expect(resLogout.status).toBe(200);

    const intentoRefresh = await refrescar(sesion.tokenRefresco);
    expect(intentoRefresh.status).toBe(401);
  });

  it('rechaza refresh token malformado o vacío con 400', async () => {
    const res1 = await refrescar('');
    expect(res1.status).toBe(400);

    const res2 = await refrescar('corto');
    expect(res2.status).toBe(400);
  });
});
