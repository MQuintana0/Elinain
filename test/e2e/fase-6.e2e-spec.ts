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

describe('Fase 6 E2E — Ciclos, Costos informativos y Reportes agregados', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailA = `comerciante-f6-a-${timestamp}@test.com`;
  const emailB = `comerciante-f6-b-${timestamp}@test.com`;
  let tokenA: string;
  let tokenB: string;

  let terceroIdA: string;
  let fincaIdA: string;
  let contratoIdA: string;
  let cicloIdA: string;
  let costoIdA: string;

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
        nombre: 'Comerciante Fase 6 A',
        email: emailA,
        password: 'Password123',
      }),
    });
    const loginA = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'Password123' }),
    });
    const authDataA = (await loginA.json()) as { datos: { tokenAcceso: string } };
    tokenA = authDataA.datos.tokenAcceso;

    // 2. Registro y login Comerciante B
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Comerciante Fase 6 B',
        email: emailB,
        password: 'Password123',
      }),
    });
    const loginB = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'Password123' }),
    });
    const authDataB = (await loginB.json()) as { datos: { tokenAcceso: string } };
    tokenB = authDataB.datos.tokenAcceso;

    // 3. Crear Tercero y Finca para Comerciante A
    const resTercero = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        nombre: 'Socio F6 A',
        documento: `DOC-F6-${timestamp}`,
        contacto: '3000000000',
      }),
    });
    const dataTercero = (await resTercero.json()) as { datos: { id: string } };
    terceroIdA = dataTercero.datos.id;

    const resFinca = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroIdA,
        nombre: 'Finca F6 A',
        direccion: 'Vereda Central',
        latitud: 8.5,
        longitud: -75.5,
      }),
    });
    const dataFinca = (await resFinca.json()) as { datos: { id: string } };
    fincaIdA = dataFinca.datos.id;

    // 4. Abrir Contrato para Comerciante A (60% comerciante, 40% tercero)
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
    const dataContrato = (await resContrato.json()) as { datos: { id: string } };
    contratoIdA = dataContrato.datos.id;

    // 5. Registrar Compra en Contrato A (20 animales @ 300kg, $8.000/kg)
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
        nota: 'Compra inicial novillos',
      }),
    });

    // 6. Registrar Venta parcial en Contrato A (5 animales @ 380kg, $9.000/kg)
    await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        contrato_id: contratoIdA,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 5,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    });
  });

  afterAll(async () => {
    try {
      if (contratoIdA) {
        await admin.db.execute(sql`DELETE FROM costos WHERE contrato_id = ${contratoIdA}`);
        await admin.db.execute(sql`DELETE FROM ciclos WHERE contrato_id = ${contratoIdA}`);
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
      await admin.cerrar();
      await app?.close();
    }
  });

  describe('Ciclos API (/api/v1/ciclos)', () => {
    it('POST /api/v1/ciclos — registra un ciclo exitosamente (201)', async () => {
      const res = await fetch(`${urlBase}/api/v1/ciclos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          contrato_id: contratoIdA,
          fecha: '2026-09-22T08:00:00.000Z',
          peso_observado: 380.5,
          notas: 'Checkpoint control sanitario',
        }),
      });

      expect(res.status).toBe(201);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { id: string; contrato_id: string; peso_observado: number };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.id).toBeDefined();
      expect(cuerpo.datos.contrato_id).toBe(contratoIdA);
      expect(cuerpo.datos.peso_observado).toBe(380.5);
      cicloIdA = cuerpo.datos.id;
    });

    it('GET /api/v1/ciclos — lista ciclos paginados del comerciante', async () => {
      const res = await fetch(`${urlBase}/api/v1/ciclos?contrato_id=${contratoIdA}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { elementos: Array<{ id: string }>; total: number };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.total).toBeGreaterThanOrEqual(1);
      expect(cuerpo.datos.elementos.some((c) => c.id === cicloIdA)).toBe(true);
    });

    it('PATCH /api/v1/ciclos/:id — actualiza un ciclo en contrato activo (200)', async () => {
      const res = await fetch(`${urlBase}/api/v1/ciclos/${cicloIdA}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          peso_observado: 385,
          notas: 'Peso corregido',
        }),
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { peso_observado: number; notas: string };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.peso_observado).toBe(385);
      expect(cuerpo.datos.notas).toBe('Peso corregido');
    });

    it('GET /api/v1/ciclos/:id — aislamiento: Comerciante B no accede al ciclo de A (404)', async () => {
      const res = await fetch(`${urlBase}/api/v1/ciclos/${cicloIdA}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Costos API (/api/v1/costos)', () => {
    it('POST /api/v1/costos — registra un costo informativo (201)', async () => {
      const res = await fetch(`${urlBase}/api/v1/costos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          contrato_id: contratoIdA,
          tipo: 'flete',
          monto: 500000,
          fecha: '2026-09-22T09:00:00.000Z',
          descripcion: 'Flete de novillos',
        }),
      });

      expect(res.status).toBe(201);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { id: string; monto: number; tipo: string };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.id).toBeDefined();
      expect(cuerpo.datos.monto).toBe(500000);
      expect(cuerpo.datos.tipo).toBe('flete');
      costoIdA = cuerpo.datos.id;
    });

    it('GET /api/v1/costos — lista costos paginados', async () => {
      const res = await fetch(`${urlBase}/api/v1/costos?contrato_id=${contratoIdA}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { total: number; elementos: Array<{ id: string }> };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.total).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/v1/costos/:id — actualiza costo libremente en contrato activo', async () => {
      const res = await fetch(`${urlBase}/api/v1/costos/${costoIdA}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          monto: 550000,
          descripcion: 'Flete con peajes',
        }),
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: { monto: number; descripcion: string };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.monto).toBe(550000);
    });

    it('GET /api/v1/costos/:id — aislamiento: Comerciante B no accede al costo de A (404)', async () => {
      const res = await fetch(`${urlBase}/api/v1/costos/${costoIdA}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Reportes API (/api/v1/reportes)', () => {
    it('GET /api/v1/reportes/dashboard — resumen KPI agregado para Comerciante A', async () => {
      const res = await fetch(`${urlBase}/api/v1/reportes/dashboard`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: {
          resumen: {
            contratos_activos: number;
            total_animales_actual: number;
            utilidad_total_acumulada: number;
            utilidad_real_comerciante_acumulada: number;
            total_costos_informativos: number;
            total_ventas_registradas: number;
          };
        };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.resumen.contratos_activos).toBe(1);
      expect(cuerpo.datos.resumen.total_animales_actual).toBe(15); // 20 - 5
      expect(cuerpo.datos.resumen.total_ventas_registradas).toBe(1);
      expect(cuerpo.datos.resumen.utilidad_total_acumulada).toBeGreaterThan(0);
      expect(cuerpo.datos.resumen.utilidad_real_comerciante_acumulada).toBeGreaterThan(0);
      expect(cuerpo.datos.resumen.total_costos_informativos).toBe(550000);
    });

    it('GET /api/v1/reportes/dashboard — Comerciante B ve 0 en métricas aisladas', async () => {
      const res = await fetch(`${urlBase}/api/v1/reportes/dashboard`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: {
          resumen: {
            contratos_activos: number;
            total_ventas_registradas: number;
            utilidad_total_acumulada: number;
          };
        };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.resumen.contratos_activos).toBe(0);
      expect(cuerpo.datos.resumen.total_ventas_registradas).toBe(0);
      expect(cuerpo.datos.resumen.utilidad_total_acumulada).toBe(0);
    });

    it('GET /api/v1/reportes/contratos-activos — lista agregaciones de contratos de A', async () => {
      const res = await fetch(`${urlBase}/api/v1/reportes/contratos-activos`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: {
          contratos: Array<{ contrato_id: string; total_compras: number; total_ventas: number }>;
        };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.contratos.length).toBe(1);
      expect(cuerpo.datos.contratos[0].contrato_id).toBe(contratoIdA);
      expect(cuerpo.datos.contratos[0].total_compras).toBe(1);
      expect(cuerpo.datos.contratos[0].total_ventas).toBe(1);
    });

    it('GET /api/v1/reportes/historial-ventas — retorna historial y totales de ventas de A', async () => {
      const res = await fetch(`${urlBase}/api/v1/reportes/historial-ventas`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });

      expect(res.status).toBe(200);
      const cuerpo = (await res.json()) as {
        exito: boolean;
        datos: {
          resumen: { total_ventas: number; total_animales_vendidos: number };
          ventas: Array<{ cantidad_vendida: number; valor_bruto: number }>;
        };
      };
      expect(cuerpo.exito).toBe(true);
      expect(cuerpo.datos.resumen.total_ventas).toBe(1);
      expect(cuerpo.datos.resumen.total_animales_vendidos).toBe(5);
      expect(cuerpo.datos.ventas.length).toBe(1);
    });
  });
});
