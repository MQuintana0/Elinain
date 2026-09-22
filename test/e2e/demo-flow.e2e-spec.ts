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

describe('Demo Flow E2E — Criterio de Finalización MVP Elinain (MVP-030)', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailDemo = `comerciante-demo-${timestamp}@elinain.com`;
  let tokenDemo: string;

  let terceroId: string;
  let fincaId: string;
  let contratoId: string;

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
  });

  afterAll(async () => {
    try {
      if (contratoId) {
        await admin.db.execute(sql`DELETE FROM costos WHERE contrato_id = ${contratoId}`);
        await admin.db.execute(sql`DELETE FROM ciclos WHERE contrato_id = ${contratoId}`);
        await admin.db.execute(sql`DELETE FROM ventas WHERE contrato_id = ${contratoId}`);
        await admin.db.execute(sql`DELETE FROM compras WHERE contrato_id = ${contratoId}`);
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contratoId}`);
      }
      if (fincaId) {
        await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${fincaId}`);
      }
      if (terceroId) {
        await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${terceroId}`);
      }
      await admin.db.execute(sql`DELETE FROM usuarios WHERE email = ${emailDemo}`);
    } finally {
      await admin.cerrar();
      await app?.close();
    }
  });

  it('Paso 1: Auth — Registro e inicio de sesión seguro del comerciante ganadero (H1, RF-1)', async () => {
    // 1. Registro
    const resRegistro = await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Carlos Comerciante Ganadero',
        email: emailDemo,
        password: 'PasswordSeguro123',
      }),
    });
    expect(resRegistro.status).toBe(201);
    const dataRegistro = (await resRegistro.json()) as { exito: boolean; datos: { email: string } };
    expect(dataRegistro.exito).toBe(true);
    expect(dataRegistro.datos.email).toBe(emailDemo);

    // 2. Acceso JWT
    const resLogin = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailDemo,
        password: 'PasswordSeguro123',
      }),
    });
    expect(resLogin.status).toBe(200);
    const dataLogin = (await resLogin.json()) as {
      exito: boolean;
      datos: { tokenAcceso: string };
    };
    expect(dataLogin.exito).toBe(true);
    expect(typeof dataLogin.datos.tokenAcceso).toBe('string');
    tokenDemo = dataLogin.datos.tokenAcceso;
  });

  it('Paso 2: Terceros y Fincas — Registro con georreferenciación espacial PostGIS (H2, RF-4, RF-5)', async () => {
    // 1. Registrar tercero (socio dueño de finca)
    const resTercero = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        nombre: 'Juan Valdez Dueño de Finca',
        documento: `CC-${timestamp}`,
        contacto: '3109876543',
      }),
    });
    expect(resTercero.status).toBe(201);
    const dataTercero = (await resTercero.json()) as { exito: boolean; datos: { id: string } };
    terceroId = dataTercero.datos.id;

    // 2. Registrar finca con coordenadas geográficas PostGIS (Montería, Colombia)
    const resFinca = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        tercero_id: terceroId,
        nombre: 'Hacienda El Paraíso',
        direccion: 'Km 12 Vía Guateque',
        latitud: 8.7512,
        longitud: -75.8814,
      }),
    });
    expect(resFinca.status).toBe(201);
    const dataFinca = (await resFinca.json()) as { exito: boolean; datos: { id: string } };
    fincaId = dataFinca.datos.id;
  });

  it('Paso 3: Contratos — Apertura con pacto inmutable de porcentajes (H3, RF-7, RF-8)', async () => {
    const resContrato = await fetch(`${urlBase}/api/v1/contratos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        tercero_id: terceroId,
        finca_id: fincaId,
        fecha_apertura: '2026-09-01T08:00:00.000Z',
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
        raza: 'Brahman Blanco',
      }),
    });
    expect(resContrato.status).toBe(201);
    const dataContrato = (await resContrato.json()) as {
      exito: boolean;
      datos: {
        id: string;
        estado: string;
        porcentaje_comerciante: number;
        porcentaje_tercero: number;
        cantidad_actual: number | null;
      };
    };
    expect(dataContrato.datos.estado).toBe('activo');
    expect(dataContrato.datos.porcentaje_comerciante).toBe(60);
    expect(dataContrato.datos.porcentaje_tercero).toBe(40);
    expect(dataContrato.datos.cantidad_actual).toBeNull();
    contratoId = dataContrato.datos.id;
  });

  it('Paso 4: Compras — Ingreso inicial y fusión con recálculo de promedio simple (H4, RF-10, RF-11)', async () => {
    // 1. Compra inicial: 20 novillos @ 300kg, $8.000/kg
    const resCompra1 = await fetch(`${urlBase}/api/v1/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha: '2026-09-01T10:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra inicial lote 1 subasta',
      }),
    });
    expect(resCompra1.status).toBe(201);
    const dataCompra1 = (await resCompra1.json()) as {
      datos: { valor_total: number; cantidad: number };
    };
    expect(dataCompra1.datos.valor_total).toBe(48000000); // 20 * 300 * 8000

    // 2. Compra 2 (Fusión): 10 novillos @ 330kg, $8.400/kg
    const resCompra2 = await fetch(`${urlBase}/api/v1/compras`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha: '2026-09-10T10:00:00.000Z',
        cantidad: 10,
        peso_promedio: 330,
        precio_kilo: 8400,
        nota: 'Fusión de 10 animales comprados en finca vecina',
      }),
    });
    expect(resCompra2.status).toBe(201);
    const dataCompra2 = (await resCompra2.json()) as {
      datos: { valor_total: number };
    };
    expect(dataCompra2.datos.valor_total).toBe(27720000); // 10 * 330 * 8400

    // 3. Verificar recálculo de inventario del contrato
    const resContratoCheck = await fetch(`${urlBase}/api/v1/contratos/${contratoId}`, {
      headers: { Authorization: `Bearer ${tokenDemo}` },
    });
    const dataContratoCheck = (await resContratoCheck.json()) as {
      datos: { cantidad_actual: number; peso_promedio_actual: number };
    };
    expect(dataContratoCheck.datos.cantidad_actual).toBe(30); // 20 + 10
    // Promedio simple entre compras vigentes: (300 + 330) / 2 = 315
    expect(dataContratoCheck.datos.peso_promedio_actual).toBe(315);
  });

  it('Paso 5: Ciclos y Costos informativos — Registro operativo sin alterar utilidad (H6, RF-23, RF-24, RF-25)', async () => {
    // 1. Checkpoint de ciclo
    const resCiclo = await fetch(`${urlBase}/api/v1/ciclos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha: '2026-09-15T08:00:00.000Z',
        peso_observado: 360,
        notas: 'Pesaje de control a mitad de ciclo, animales ganando peso sostenido',
      }),
    });
    expect(resCiclo.status).toBe(201);
    const dataCiclo = (await resCiclo.json()) as { datos: { id: string } };
    expect(dataCiclo.datos.id).toBeDefined();

    // 2. Costo informativo tipo flete
    const resCosto = await fetch(`${urlBase}/api/v1/costos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        tipo: 'flete',
        monto: 1200000,
        fecha: '2026-09-01T12:00:00.000Z',
        descripcion: 'Flete en camión ganadero doble troque desde feria subasta',
      }),
    });
    expect(resCosto.status).toBe(201);
    const dataCosto = (await resCosto.json()) as { datos: { id: string } };
    expect(dataCosto.datos.id).toBeDefined();
  });

  it('Paso 6: Ventas — Venta parcial con congelamiento de snapshots financieros (H5, RF-14 a RF-20)', async () => {
    // Venta parcial: 15 animales @ 410kg, $9.600/kg
    const resVenta1 = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha: '2026-09-20T14:00:00.000Z',
        cantidad_vendida: 15,
        peso_promedio_venta: 410,
        precio_kilo_venta: 9600,
      }),
    });
    expect(resVenta1.status).toBe(201);
    const dataVenta1 = (await resVenta1.json()) as {
      datos: {
        id: string;
        valor_bruto: number;
        costo_estimado_compra: number;
        utilidad_total: number;
        valor_comerciante: number;
        valor_tercero: number;
        utilidad_real: number;
        kilos_ganados_promedio: number;
        porcentaje_utilidad_total: number;
        peso_promedio_compra_simple: number;
        precio_compra_por_animal_promedio: number;
      };
    };
    expect(dataVenta1.datos.id).toBeDefined();

    // Aserciones financieras exactas:
    // 15 * 410 * 9600 = 59,040,000
    expect(dataVenta1.datos.valor_bruto).toBe(59040000);
    // Promedio simple precio por animal: ((300*8000) + (330*8400)) / 2 = (2.4M + 2.772M) / 2 = 2,586,000
    expect(dataVenta1.datos.precio_compra_por_animal_promedio).toBe(2586000);
    expect(dataVenta1.datos.peso_promedio_compra_simple).toBe(315);
    // Costo estimado: 15 * 2,586,000 = 38,790,000
    expect(dataVenta1.datos.costo_estimado_compra).toBe(38790000);
    // Utilidad total antes del reparto: 59,040,000 - 38,790,000 = 20,250,000
    expect(dataVenta1.datos.utilidad_total).toBe(20250000);
    // Reparto 60% comerciante / 40% tercero
    expect(dataVenta1.datos.valor_comerciante).toBe(12150000);
    expect(dataVenta1.datos.valor_tercero).toBe(8100000);
    expect(dataVenta1.datos.utilidad_real).toBe(12150000);
    expect(dataVenta1.datos.kilos_ganados_promedio).toBe(95); // 410 - 315

    // Verificar que el contrato sigue activo con saldo 15
    const resContratoActivo = await fetch(`${urlBase}/api/v1/contratos/${contratoId}`, {
      headers: { Authorization: `Bearer ${tokenDemo}` },
    });
    const dataContratoActivo = (await resContratoActivo.json()) as {
      datos: { estado: string; cantidad_actual: number; fecha_cierre: string | null };
    };
    expect(dataContratoActivo.datos.estado).toBe('activo');
    expect(dataContratoActivo.datos.cantidad_actual).toBe(15);
    expect(dataContratoActivo.datos.fecha_cierre).toBeNull();
  });

  it('Paso 7: Liquidación total y Cierre automático del contrato (H5, RF-21)', async () => {
    // Venta de los 15 animales restantes @ 420kg, $9.800/kg
    const fechaVentaFinal = '2026-09-22T16:00:00.000Z';
    const resVenta2 = await fetch(`${urlBase}/api/v1/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenDemo}`,
      },
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha: fechaVentaFinal,
        cantidad_vendida: 15,
        peso_promedio_venta: 420,
        precio_kilo_venta: 9800,
      }),
    });
    expect(resVenta2.status).toBe(201);
    const dataVenta2 = (await resVenta2.json()) as {
      datos: {
        id: string;
        valor_bruto: number;
        utilidad_total: number;
        valor_comerciante: number;
      };
    };
    expect(dataVenta2.datos.id).toBeDefined();
    // 15 * 420 * 9800 = 61,740,000
    expect(dataVenta2.datos.valor_bruto).toBe(61740000);
    // 61,740,000 - 38,790,000 = 22,950,000
    expect(dataVenta2.datos.utilidad_total).toBe(22950000);
    expect(dataVenta2.datos.valor_comerciante).toBe(13770000);

    // Verificar cierre automático estricto en el contrato (RF-21)
    const resContratoCerrado = await fetch(`${urlBase}/api/v1/contratos/${contratoId}`, {
      headers: { Authorization: `Bearer ${tokenDemo}` },
    });
    const dataContratoCerrado = (await resContratoCerrado.json()) as {
      datos: { estado: string; cantidad_actual: number; fecha_cierre: string };
    };
    expect(dataContratoCerrado.datos.estado).toBe('cerrado');
    expect(dataContratoCerrado.datos.cantidad_actual).toBe(0);
    expect(new Date(dataContratoCerrado.datos.fecha_cierre).getTime()).toBe(
      new Date(fechaVentaFinal).getTime(),
    );
  });

  it('Paso 8: Reportes y Dashboard — Verificación contable consolidada por agregación (H7, RF-26)', async () => {
    // 1. Dashboard general
    const resDashboard = await fetch(`${urlBase}/api/v1/reportes/dashboard`, {
      headers: { Authorization: `Bearer ${tokenDemo}` },
    });
    expect(resDashboard.status).toBe(200);
    const dataDashboard = (await resDashboard.json()) as {
      datos: {
        resumen: {
          contratos_activos: number;
          contratos_cerrados: number;
          total_animales_actual: number;
          utilidad_total_acumulada: number;
          utilidad_real_comerciante_acumulada: number;
          utilidad_terceros_acumulada: number;
          total_costos_informativos: number;
          total_ventas_registradas: number;
        };
      };
    };

    const resumen = dataDashboard.datos.resumen;
    expect(resumen.contratos_activos).toBe(0);
    expect(resumen.contratos_cerrados).toBe(1);
    expect(resumen.total_animales_actual).toBe(0);
    // Utilidad total: 20,250,000 + 22,950,000 = 43,200,000
    expect(resumen.utilidad_total_acumulada).toBe(43200000);
    // Utilidad comerciante: 12,150,000 + 13,770,000 = 25,920,000
    expect(resumen.utilidad_real_comerciante_acumulada).toBe(25920000);
    // Utilidad terceros: 8,100,000 + 9,180,000 = 17,280,000
    expect(resumen.utilidad_terceros_acumulada).toBe(17280000);
    // Costo informativo intacto sin restar de utilidad: 1,200,000
    expect(resumen.total_costos_informativos).toBe(1200000);
    expect(resumen.total_ventas_registradas).toBe(2);

    // 2. Historial de ventas agregado
    const resHistorial = await fetch(`${urlBase}/api/v1/reportes/historial-ventas`, {
      headers: { Authorization: `Bearer ${tokenDemo}` },
    });
    expect(resHistorial.status).toBe(200);
    const dataHistorial = (await resHistorial.json()) as {
      datos: {
        resumen: { total_ventas: number; total_animales_vendidos: number };
        ventas: Array<{ venta_id: string; cantidad_vendida: number }>;
      };
    };
    expect(dataHistorial.datos.resumen.total_ventas).toBe(2);
    expect(dataHistorial.datos.resumen.total_animales_vendidos).toBe(30);
    expect(dataHistorial.datos.ventas.length).toBe(2);
  });
});
