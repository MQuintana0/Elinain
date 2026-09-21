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

describe('Ventas E2E — Ciclo completo, Multi-Tenant, Inmutabilidad y Cierre (Fase 5)', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailA = `comerciante-a-${timestamp}@ventas-e2e.com`;
  const emailB = `comerciante-b-${timestamp}@ventas-e2e.com`;
  let tokenA: string;
  let tokenB: string;

  let terceroIdA: string;
  let fincaIdA: string;
  let contratoIdA: string;
  let ventaIdA: string;

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

    // 1. Registro y login Comerciante A
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Comerciante A Ventas',
        email: emailA,
        password: 'Password123',
      }),
    });
    const loginA = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'Password123' }),
    });
    const cuerpoA = (await loginA.json()) as { datos: { tokenAcceso: string } };
    tokenA = cuerpoA.datos.tokenAcceso;

    // 2. Registro y login Comerciante B
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Comerciante B Ventas',
        email: emailB,
        password: 'Password123',
      }),
    });
    const loginB = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'Password123' }),
    });
    const cuerpoB = (await loginB.json()) as { datos: { tokenAcceso: string } };
    tokenB = cuerpoB.datos.tokenAcceso;

    // 3. Crear Tercero para A
    const resTercero = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        nombre: 'Tercero Ventas E2E',
        documento: `DOC-VENTAS-E2E-${timestamp}`,
        contacto: '3007778899',
      }),
    });
    const cuerpoTercero = (await resTercero.json()) as { datos: { id: string } };
    terceroIdA = cuerpoTercero.datos.id;

    // 4. Crear Finca para A
    const resFinca = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        nombre: 'Finca Ventas E2E',
        direccion: 'Vereda Las Palmas',
        latitud: 8.85,
        longitud: -75.82,
      }),
    });
    const cuerpoFinca = (await resFinca.json()) as { datos: { id: string } };
    fincaIdA = cuerpoFinca.datos.id;

    // 5. Crear Contrato para A
    const resContrato = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        finca_id: fincaIdA,
        fecha_apertura: '2026-09-21T08:00:00.000Z',
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
      }),
    });
    const cuerpoContrato = (await resContrato.json()) as { datos: { id: string } };
    contratoIdA = cuerpoContrato.datos.id;

    // 6. Registrar compra de 20 animales
    await fetch(`${urlBase}/api/v1/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra base para ciclo de ventas',
      }),
    });
  });

  afterAll(async () => {
    try {
      if (contratoIdA) {
        await admin.db.execute(sql`DELETE FROM ventas WHERE contrato_id = ${contratoIdA}`);
        await admin.db.execute(sql`DELETE FROM compras WHERE contrato_id = ${contratoIdA}`);
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contratoIdA}`);
      }
      if (fincaIdA) {
        await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${fincaIdA}`);
      }
      if (terceroIdA) {
        await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${terceroIdA}`);
      }
      await admin.db.execute(sql`DELETE FROM usuarios WHERE email IN (${emailA}, ${emailB})`);
    } finally {
      if (app) {
        await app.close();
      }
      await admin.cerrar();
    }
  });

  it('POST /api/v1/ventas rechaza datos inválidos con 400 Bad Request en español', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: 'fecha-invalida',
        cantidad_vendida: -5,
        peso_promedio_venta: 0,
        precio_kilo_venta: -1000,
      }),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { exito: boolean; errores: string[] };
    expect(cuerpo.exito).toBe(false);
  });

  it('POST /api/v1/ventas con Comerciante B sobre contrato de A responde 404 (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 5,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    });

    expect(respuesta.status).toBe(404);
  });

  it('POST /api/v1/ventas registra venta parcial de 10 animales (201 Created)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 10,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    });

    expect(respuesta.status).toBe(201);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      datos: {
        id: string;
        contrato_id: string;
        cantidad_vendida: number;
        valor_bruto: number;
        utilidad_total: number;
        valor_comerciante: number;
        valor_tercero: number;
        utilidad_real: number;
      };
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos.cantidad_vendida).toBe(10);
    expect(cuerpo.datos.valor_bruto).toBe(34200000);
    expect(cuerpo.datos.utilidad_total).toBe(10200000);
    expect(cuerpo.datos.valor_comerciante).toBe(6120000);
    expect(cuerpo.datos.valor_tercero).toBe(4080000);
    ventaIdA = cuerpo.datos.id;
  });

  it('GET /api/v1/ventas devuelve listado paginado con la venta registrada', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas?contrato_id=${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      datos: { elementos: Array<{ id: string }>; total: number };
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos.total).toBe(1);
    expect(cuerpo.datos.elementos[0]?.id).toBe(ventaIdA);
  });

  it('GET /api/v1/ventas con Comerciante B retorna lista vacía (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      datos: { elementos: Array<unknown>; total: number };
    };
    expect(cuerpo.datos.total).toBe(0);
  });

  it('GET /api/v1/ventas/:id con Comerciante B responde 404 (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas/${ventaIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(respuesta.status).toBe(404);
  });

  it('PATCH /api/v1/ventas/:id responde 405 Method Not Allowed (inmutabilidad)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas/${ventaIdA}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ cantidad_vendida: 12 }),
    });

    expect(respuesta.status).toBe(405);
  });

  it('DELETE /api/v1/ventas/:id responde 405 Method Not Allowed (inmutabilidad)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/ventas/${ventaIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(respuesta.status).toBe(405);
  });

  it('POST /api/v1/ventas vendiendo el remanente de 10 animales cierra el contrato (201 Created)', async () => {
    const fechaCierre = '2026-09-22T16:00:00.000Z';
    const respuesta = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: fechaCierre,
        cantidad_vendida: 10,
        peso_promedio_venta: 390,
        precio_kilo_venta: 9100,
      }),
    });

    expect(respuesta.status).toBe(201);

    // Verificar que el contrato ahora está CERRADO y con fecha_cierre
    const resContrato = await fetch(`${urlBase}/api/v1/contratos/${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const cuerpoContrato = (await resContrato.json()) as {
      datos: { estado: string; cantidad_actual: number; fecha_cierre: string };
    };
    expect(cuerpoContrato.datos.estado).toBe('cerrado');
    expect(cuerpoContrato.datos.cantidad_actual).toBe(0);
    expect(new Date(cuerpoContrato.datos.fecha_cierre).getTime()).toBe(
      new Date(fechaCierre).getTime(),
    );
  });
});
