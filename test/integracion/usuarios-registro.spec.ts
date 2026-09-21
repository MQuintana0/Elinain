// RED (MVP-005): registro de perfil de comerciante.
// Debe FALLAR sin el módulo usuarios/ (controller/service/repository/dto).
// Patrón del repo: DB real vía src/db/conexion + app Nest con los
// mismos globales que src/main.ts (ValidationPipe, filtro, interceptores).
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { usuarios } from '../../src/db/schema/usuarios';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { UsuariosModule } from '../../src/usuarios/usuarios.module';

const urlConexion =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';
// Prefijo único por ejecución para no colisionar entre corridas ni borrar datos ajenos.
const prefijoEmail = `mvp005-${Date.now()}-`;
let contador = 0;

function nuevoEmail(): string {
  contador += 1;
  return `${prefijoEmail}${contador}@ejemplo.com`;
}

interface CuerpoRegistro {
  exito: boolean;
  datos: { id: string; nombre: string; email: string; password_hash?: string; password?: string };
}

interface CuerpoError {
  exito: boolean;
  mensaje: string;
  errores?: string[];
  codigoEstado: number;
}

describe('Registro de perfil de comerciante (MVP-005)', () => {
  let app: INestApplication;
  const correosCreados: string[] = [];

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [UsuariosModule],
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
    app.setGlobalPrefix('api/v1');
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

  async function registrar(cuerpo: unknown): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  }

  it('registra un comerciante válido con 201 sin exponer password_hash', async () => {
    const email = nuevoEmail();
    const respuesta = await registrar({ nombre: 'María Quintero', email, password: 'Secreto123' });
    expect(respuesta.status).toBe(201);
    const cuerpo = (await respuesta.json()) as CuerpoRegistro;
    expect(cuerpo.exito).toBe(true);
    expect(typeof cuerpo.datos.id).toBe('string');
    expect(cuerpo.datos.nombre).toBe('María Quintero');
    expect(cuerpo.datos.email).toBe(email);
    expect(cuerpo.datos.password_hash).toBeUndefined();
    expect(cuerpo.datos.password).toBeUndefined();
    correosCreados.push(email);
  });

  it('persiste la contraseña hasheada con bcrypt y nunca en texto plano', async () => {
    const email = nuevoEmail();
    const respuesta = await registrar({ nombre: 'Pedro Lanza', email, password: 'Secreto123' });
    expect(respuesta.status).toBe(201);
    correosCreados.push(email);

    const conexion = crearConexionDb(urlConexion);
    try {
      const filas = await conexion.db.select().from(usuarios).where(eq(usuarios.email, email));
      expect(filas).toHaveLength(1);
      const hash = filas[0]?.password_hash;
      if (typeof hash !== 'string') {
        throw new Error('La fila creada no trae password_hash');
      }
      expect(hash).not.toBe('Secreto123');
      expect(hash.length).toBeGreaterThan(20);
      await expect(bcrypt.compare('Secreto123', hash)).resolves.toBe(true);
      await expect(bcrypt.compare('OtraClave999', hash)).resolves.toBe(false);
    } finally {
      await conexion.cerrar();
    }
  });

  it('rechaza el registro sin nombre con 400 en español', async () => {
    const respuesta = await registrar({ email: nuevoEmail(), password: 'Secreto123' });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(400);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/nombre|obligatorio|validaci/);
  });

  it('rechaza el registro sin email con 400 en español', async () => {
    const respuesta = await registrar({ nombre: 'Sin Correo', password: 'Secreto123' });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(400);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/email|obligatorio|validaci/);
  });

  it('rechaza el registro sin password con 400 en español', async () => {
    const respuesta = await registrar({ nombre: 'Sin Clave', email: nuevoEmail() });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(400);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/contrase|obligatorio|validaci/);
  });

  it('rechaza el email con formato inválido con 400 en español', async () => {
    const respuesta = await registrar({
      nombre: 'Correo Malo',
      email: 'no-es-un-correo',
      password: 'Secreto123',
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/email|correo|validaci/);
  });

  it('rechaza la contraseña demasiado corta con 400 en español', async () => {
    const respuesta = await registrar({
      nombre: 'Clave Corta',
      email: nuevoEmail(),
      password: 'corta',
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/contrase|caracteres|validaci/);
  });

  it('rechaza el email duplicado con 409 en español', async () => {
    const email = nuevoEmail();
    const primera = await registrar({ nombre: 'Original', email, password: 'Secreto123' });
    expect(primera.status).toBe(201);
    correosCreados.push(email);

    const segunda = await registrar({ nombre: 'Duplicado', email, password: 'Secreto123' });
    expect(segunda.status).toBe(409);
    const cuerpo = (await segunda.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(409);
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/email|registrado|conflicto|duplicado/);
  });

  it('rechaza propiedades no permitidas como password_hash con 400', async () => {
    const respuesta = await registrar({
      nombre: 'Intruso',
      email: nuevoEmail(),
      password: 'Secreto123',
      password_hash: 'texto-plano-no-permitido',
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
  });
});
