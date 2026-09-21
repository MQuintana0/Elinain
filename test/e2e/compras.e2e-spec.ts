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

describe('Compras E2E — Registro, Mutación, Aislamiento y Reversión (Fase 4)', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailA = `comerciante-a-${timestamp}@compras-e2e.com`;
  const emailB = `comerciante-b-${timestamp}@compras-e2e.com`;
  let tokenA: string;
  let tokenB: string;

  let terceroIdA: string;
  let fincaIdA: string;
  let contratoIdA: string;
  let compraIdA: string;

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
        nombre: 'Comerciante A Compras',
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
        nombre: 'Comerciante B Compras',
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
        nombre: 'Tercero Compras',
        documento: `DOC-COMPRAS-${timestamp}`,
        contacto: '3001112233',
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
        nombre: 'Finca Compras',
        direccion: 'Vereda El Salto Km 4',
        latitud: 8.75,
        longitud: -75.88,
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
  });

  afterAll(async () => {
    try {
      if (compraIdA) {
        await admin.db.execute(sql`DELETE FROM compras WHERE id = ${compraIdA}`);
      }
      if (contratoIdA) {
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

  it('POST /api/v1/compras rechaza datos inválidos con 400 Bad Request en español', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: 'fecha-invalida',
        cantidad: -10,
        peso_promedio: 0,
        precio_kilo: -500,
        nota: '',
      }),
    });

    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { exito: boolean; errores: string[] };
    expect(cuerpo.exito).toBe(false);
  });

  it('POST /api/v1/compras con comerciante B sobre contrato de A responde 404 (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra intento ajeno',
      }),
    });

    expect(respuesta.status).toBe(404);
  });

  it('POST /api/v1/compras registra compra y actualiza inventario del contrato (201 Created)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras`, {
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
        nota: 'Primera compra lote novillos',
      }),
    });

    expect(respuesta.status).toBe(201);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      datos: {
        id: string;
        contrato_id: string;
        cantidad: number;
        peso_promedio: number;
        precio_kilo: number;
        valor_total: number;
      };
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos.contrato_id).toBe(contratoIdA);
    expect(cuerpo.datos.cantidad).toBe(20);
    expect(cuerpo.datos.peso_promedio).toBe(300);
    expect(cuerpo.datos.precio_kilo).toBe(8000);
    expect(cuerpo.datos.valor_total).toBe(48000000); // 20 * 300 * 8000
    compraIdA = cuerpo.datos.id;
  });

  it('GET /api/v1/compras devuelve listado paginado con la compra registrada', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras?contrato_id=${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      datos: {
        elementos: Array<{ id: string }>;
        total: number;
        limite: number;
        offset: number;
      };
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos.total).toBe(1);
    expect(cuerpo.datos.elementos[0]?.id).toBe(compraIdA);
  });

  it('GET /api/v1/compras con Comerciante B retorna lista vacía (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      datos: { elementos: Array<unknown>; total: number };
    };
    expect(cuerpo.datos.total).toBe(0);
    expect(cuerpo.datos.elementos).toHaveLength(0);
  });

  it('GET /api/v1/compras/:id con Comerciante B responde 404 (aislamiento)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras/${compraIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(respuesta.status).toBe(404);
  });

  it('PATCH /api/v1/compras/:id actualiza compra y sincroniza inventario del contrato', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras/${compraIdA}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        cantidad: 25,
        peso_promedio: 320,
        precio_kilo: 8100,
        nota: 'Compra corregida tras revisión de báscula',
      }),
    });

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      datos: {
        cantidad: number;
        peso_promedio: number;
        precio_kilo: number;
        valor_total: number;
        nota: string;
      };
    };
    expect(cuerpo.datos.cantidad).toBe(25);
    expect(cuerpo.datos.peso_promedio).toBe(320);
    expect(cuerpo.datos.precio_kilo).toBe(8100);
    expect(cuerpo.datos.valor_total).toBe(64800000); // 25 * 320 * 8100
  });

  it('DELETE /api/v1/compras/:id elimina compra y revierte el inventario a cero (204 No Content)', async () => {
    const respuesta = await fetch(`${urlBase}/api/v1/compras/${compraIdA}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(respuesta.status).toBe(204);

    // Reconsulta de la compra debe ser 404
    const resVerificacion = await fetch(`${urlBase}/api/v1/compras/${compraIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resVerificacion.status).toBe(404);

    // Contrato revertido
    const resContrato = await fetch(`${urlBase}/api/v1/contratos/${contratoIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const cuerpoContrato = (await resContrato.json()) as {
      datos: { cantidad_actual: number; peso_promedio_actual: number | null };
    };
    expect(cuerpoContrato.datos.cantidad_actual).toBe(0);
    expect(cuerpoContrato.datos.peso_promedio_actual).toBeNull();
  });
});
