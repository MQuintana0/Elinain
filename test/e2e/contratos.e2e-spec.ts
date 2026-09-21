import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { crearConexionDb } from '../../src/db/conexion';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Contratos E2E — Apertura y Aislamiento Multi-Tenant (MVP-013)', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailA = `tenant-a-${timestamp}@contratos-e2e.com`;
  const emailB = `tenant-b-${timestamp}@contratos-e2e.com`;
  let tokenA: string;
  let tokenB: string;

  let terceroIdA: string;
  let fincaIdA: string;
  let terceroIdB: string;
  let fincaIdB: string;

  const contratosCreados: string[] = [];

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
    urlBase = await app.getUrl();

    // 1. Registro y login de Comerciante A
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Comerciante A', email: emailA, password: 'Password123' }),
    });
    const loginA = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'Password123' }),
    });
    const cuerpoA = (await loginA.json()) as { datos: { tokenAcceso: string } };
    tokenA = cuerpoA.datos.tokenAcceso;

    // 2. Registro y login de Comerciante B
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Comerciante B', email: emailB, password: 'Password123' }),
    });
    const loginB = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'Password123' }),
    });
    const cuerpoB = (await loginB.json()) as { datos: { tokenAcceso: string } };
    tokenB = cuerpoB.datos.tokenAcceso;

    // 3. Crear Tercero y Finca para Comerciante A
    const resTerceroA = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        nombre: 'Tercero de A',
        documento: `DOC-A-${timestamp}`,
        contacto: '3001234567',
      }),
    });
    const datosTerceroA = (await resTerceroA.json()) as { datos: { id: string } };
    terceroIdA = datosTerceroA.datos.id;

    const resFincaA = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        nombre: 'Finca de A',
        direccion: 'Vereda El Palmar',
        latitud: 8.5432,
        longitud: -75.8765,
      }),
    });
    const datosFincaA = (await resFincaA.json()) as { datos: { id: string } };
    fincaIdA = datosFincaA.datos.id;

    // 4. Crear Tercero y Finca para Comerciante B
    const resTerceroB = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        nombre: 'Tercero de B',
        documento: `DOC-B-${timestamp}`,
        contacto: '3007654321',
      }),
    });
    const datosTerceroB = (await resTerceroB.json()) as { datos: { id: string } };
    terceroIdB = datosTerceroB.datos.id;

    const resFincaB = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdB,
        nombre: 'Finca de B',
        direccion: 'Vereda Las Flores',
        latitud: 8.6543,
        longitud: -75.9876,
      }),
    });
    const datosFincaB = (await resFincaB.json()) as { datos: { id: string } };
    fincaIdB = datosFincaB.datos.id;
  }, 35000);

  afterAll(async () => {
    try {
      for (const id of contratosCreados) {
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${id}`);
      }
      await admin.db.execute(sql`DELETE FROM fincas WHERE id IN (${fincaIdA}, ${fincaIdB})`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id IN (${terceroIdA}, ${terceroIdB})`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE email IN (${emailA}, ${emailB})`);
    } finally {
      await app?.close();
      await admin.cerrar();
    }
  });

  it('rechaza con 401 cualquier petición a /contratos sin token JWT (TenantGuard)', async () => {
    const res = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        finca_id: fincaIdA,
        fecha_apertura: '2026-09-21T10:00:00.000Z',
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
      }),
    });
    expect(res.status).toBe(401);

    const resListar = await fetch(`${urlBase}/api/v1/contratos`);
    expect(resListar.status).toBe(401);
  });

  it('valida DTOs con 400 ante campos faltantes o porcentajes inválidos', async () => {
    // Falta porcentaje_tercero
    const resSinCampo = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        finca_id: fincaIdA,
        fecha_apertura: '2026-09-21T10:00:00.000Z',
        porcentaje_comerciante: 60,
      }),
    });
    expect(resSinCampo.status).toBe(400);
    const errSinCampo = (await resSinCampo.json()) as { exito: boolean; codigoEstado: number };
    expect(errSinCampo.exito).toBe(false);
    expect(errSinCampo.codigoEstado).toBe(400);

    // Porcentaje fuera de rango (> 100)
    const resPorcentajeInvalido = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        finca_id: fincaIdA,
        fecha_apertura: '2026-09-21T10:00:00.000Z',
        porcentaje_comerciante: 120,
        porcentaje_tercero: -10,
      }),
    });
    expect(resPorcentajeInvalido.status).toBe(400);
  });

  it('permite a Comerciante A aperturar contrato con estado "activo" y aísla los datos frente a Comerciante B', async () => {
    // 1. Comerciante A apertura contrato exitosamente
    const resCrear = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        finca_id: fincaIdA,
        fecha_apertura: '2026-09-21T14:00:00.000Z',
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
        raza: 'Brahman Blanco',
        peso_promedio_actual: 340.5,
        cantidad_actual: 45,
        valor_kilo_referencia: 8400,
      }),
    });
    expect(resCrear.status).toBe(201);
    const cuerpoCrear = (await resCrear.json()) as { datos: { id: string; estado: string } };
    const contratoIdA = cuerpoCrear.datos.id;
    contratosCreados.push(contratoIdA);
    expect(cuerpoCrear.datos.estado).toBe('activo');

    // 2. Comerciante A puede consultar su contrato por ID
    const resGetA = await fetch(`${urlBase}/api/v1/contratos/${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resGetA.status).toBe(200);

    // 3. Comerciante B intenta ver el contrato de A -> 404
    const resGetB = await fetch(`${urlBase}/api/v1/contratos/${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(resGetB.status).toBe(404);

    // 4. Comerciante B lista contratos -> no incluye el contrato de A
    const resListarB = await fetch(`${urlBase}/api/v1/contratos`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(resListarB.status).toBe(200);
    const cuerpoListarB = (await resListarB.json()) as { datos: Array<{ id: string }> };
    expect(cuerpoListarB.datos.map((c) => c.id)).not.toContain(contratoIdA);

    // 5. Comerciante B intenta crear contrato usando finca o tercero de A -> 404
    const resCruzado = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA, // pertenece a A
        finca_id: fincaIdB,
        fecha_apertura: '2026-09-21T14:00:00.000Z',
        porcentaje_comerciante: 50,
        porcentaje_tercero: 50,
      }),
    });
    expect(resCruzado.status).toBe(404);
  });
});
