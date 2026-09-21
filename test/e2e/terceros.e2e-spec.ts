import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { crearConexionDb } from '../../src/db/conexion';
import { usuarios } from '../../src/db/schema/usuarios';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Terceros y Fincas E2E — Aislamiento Multi-Tenant (MVP-007, 008, 009, 010)', () => {
  let app: INestApplication;
  let urlBase: string;
  const admin = crearConexionDb(urlAdmin);

  const timestamp = Date.now();
  const emailA = `tenant-a-${timestamp}@e2e.com`;
  const emailB = `tenant-b-${timestamp}@e2e.com`;
  let tokenA: string;
  let tokenB: string;

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

    // 1. Registrar usuario A
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Comerciante A', email: emailA, password: 'Password123' }),
    });

    // Login usuario A
    const loginA = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'Password123' }),
    });
    const cuerpoA = (await loginA.json()) as { datos: { tokenAcceso: string } };
    tokenA = cuerpoA.datos.tokenAcceso;

    // 2. Registrar usuario B
    await fetch(`${urlBase}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Comerciante B', email: emailB, password: 'Password123' }),
    });

    // Login usuario B
    const loginB = await fetch(`${urlBase}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'Password123' }),
    });
    const cuerpoB = (await loginB.json()) as { datos: { tokenAcceso: string } };
    tokenB = cuerpoB.datos.tokenAcceso;
  }, 30000);

  afterAll(async () => {
    try {
      // Limpiar datos
      await admin.db.execute(sql`
        DELETE FROM fincas WHERE tercero_id IN (
          SELECT id FROM terceros WHERE usuario_id IN (
            SELECT id FROM usuarios WHERE email IN (${emailA}, ${emailB})
          )
        )
      `);
      await admin.db.execute(sql`
        DELETE FROM terceros WHERE usuario_id IN (
          SELECT id FROM usuarios WHERE email IN (${emailA}, ${emailB})
        )
      `);
      await admin.db.delete(usuarios).where(eq(usuarios.email, emailA));
      await admin.db.delete(usuarios).where(eq(usuarios.email, emailB));
    } finally {
      await admin.cerrar();
      await app?.close();
    }
  });

  it('rechaza con 401 cualquier petición a /terceros y /fincas sin token JWT (TenantGuard)', async () => {
    const resTerceros = await fetch(`${urlBase}/api/v1/terceros`);
    expect(resTerceros.status).toBe(401);

    const resFincas = await fetch(`${urlBase}/api/v1/fincas`);
    expect(resFincas.status).toBe(401);
  });

  it('valida DTOs con 400 ante campos faltantes o coordenadas inválidas (RF-4, RF-5, RF-6)', async () => {
    // Tercero sin documento
    const resSinDoc = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ nombre: 'Incompleto', contacto: '300' }),
    });
    expect(resSinDoc.status).toBe(400);

    // Finca con latitud fuera de rango (-95)
    const resLatInvalida = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        nombre: 'Finca Error',
        direccion: 'Calle 1',
        latitud: -95,
        longitud: 50,
      }),
    });
    expect(resLatInvalida.status).toBe(400);
  });

  it('aísla completamente los datos entre Comerciante A y B a nivel HTTP (Aislamiento Tenant E2E)', async () => {
    // 1. Comerciante A crea un tercero
    const crearTerceroA = await fetch(`${urlBase}/api/v1/terceros`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        nombre: 'Tercero de Comerciante A',
        documento: 'NIT-A-100',
        contacto: '3009998877',
      }),
    });
    expect(crearTerceroA.status).toBe(201);
    const terceroA = ((await crearTerceroA.json()) as { datos: { id: string } }).datos;

    // 2. Comerciante A crea una finca para su tercero
    const crearFincaA = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        tercero_id: terceroA.id,
        nombre: 'Finca Hacienda A',
        direccion: 'Vereda El Sol',
        latitud: 8.5,
        longitud: -75.5,
      }),
    });
    expect(crearFincaA.status).toBe(201);
    const fincaA = ((await crearFincaA.json()) as { datos: { id: string } }).datos;

    // 3. Comerciante B lista sus terceros -> lista vacía
    const listarTercerosB = await fetch(`${urlBase}/api/v1/terceros`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(listarTercerosB.status).toBe(200);
    const listaB = (
      (await listarTercerosB.json()) as { datos: { elementos: Array<{ id: string }> } }
    ).datos.elementos;
    expect(listaB.some((t) => t.id === terceroA.id)).toBe(false);

    // 4. Comerciante B intenta acceder directamente al tercero de A por ID -> 404
    const obtenerTerceroAjeno = await fetch(`${urlBase}/api/v1/terceros/${terceroA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(obtenerTerceroAjeno.status).toBe(404);

    // 5. Comerciante B intenta modificar el tercero de A -> 404
    const editarTerceroAjeno = await fetch(`${urlBase}/api/v1/terceros/${terceroA.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ nombre: 'Intento de Hack' }),
    });
    expect(editarTerceroAjeno.status).toBe(404);

    // 6. Comerciante B lista sus fincas -> lista vacía
    const listarFincasB = await fetch(`${urlBase}/api/v1/fincas`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(listarFincasB.status).toBe(200);
    const fincasB = (
      (await listarFincasB.json()) as { datos: { elementos: Array<{ id: string }> } }
    ).datos.elementos;
    expect(fincasB.some((f) => f.id === fincaA.id)).toBe(false);

    // 7. Comerciante B intenta ver finca de A por ID -> 404
    const obtenerFincaAjena = await fetch(`${urlBase}/api/v1/fincas/${fincaA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(obtenerFincaAjena.status).toBe(404);

    // 8. Comerciante B intenta crear una finca usando el tercero_id de A -> 400 (tercero no pertenece)
    const asociarFincaTerceroAjeno = await fetch(`${urlBase}/api/v1/fincas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        tercero_id: terceroA.id,
        nombre: 'Finca Falsa en Tercero Ajeno',
        direccion: 'Sin Permiso',
        latitud: 8.0,
        longitud: -75.0,
      }),
    });
    expect(asociarFincaTerceroAjeno.status).toBe(400);
  });
});
