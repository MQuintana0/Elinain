// E2E (MVP-005): flujo HTTP real del registro contra la aplicación completa.
// Replica los globales de src/main.ts (ValidationPipe, filtro, interceptores
// y prefijo api/v1) sin ejecutar el bootstrap (sin efecto colateral: el
// arranque de main.ts solo corre cuando es el módulo principal).
// Solo existe la ruta de registro; se verifica POST válido + duplicado 409
// + validación 400 sobre el mismo cableado de producción.
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../src/app.module';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { crearConexionDb } from '../../src/db/conexion';
import { usuarios } from '../../src/db/schema/usuarios';

const urlConexion = process.env.DATABASE_URL ?? 'postgres://elinain:elinain@localhost:5433/elinain';
const prefijoEmail = `mvp005-e2e-${Date.now()}-`;
let contador = 0;

function nuevoEmail(): string {
  contador += 1;
  return `${prefijoEmail}${contador}@ejemplo.com`;
}

describe('Registro de usuarios E2E (MVP-005)', () => {
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
        await conexion.db.delete(usuarios).where(eq(usuarios.email, email));
      }
    } finally {
      await conexion.cerrar();
    }
    await app?.close();
  });

  it('POST /api/v1/usuarios/registro crea el comerciante y el duplicado responde 409', async () => {
    const url = await app.getUrl();
    const email = nuevoEmail();

    const primera = await fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Comerciante E2E', email, password: 'Secreto123' }),
    });
    expect(primera.status).toBe(201);
    const cuerpo = (await primera.json()) as {
      exito: boolean;
      datos: { id: string; nombre: string; email: string };
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos.email).toBe(email);
    expect('password_hash' in cuerpo.datos).toBe(false);
    correosCreados.push(email);

    const duplicada = await fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Otro Nombre', email, password: 'Secreto123' }),
    });
    expect(duplicada.status).toBe(409);
    const cuerpoError = (await duplicada.json()) as { exito: boolean; codigoEstado: number };
    expect(cuerpoError.exito).toBe(false);
    expect(cuerpoError.codigoEstado).toBe(409);

    const invalida = await fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Sin Clave', email: nuevoEmail() }),
    });
    expect(invalida.status).toBe(400);
  });
});
