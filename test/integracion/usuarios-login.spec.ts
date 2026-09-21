// RED (MVP-006): inicio de sesión JWT.
// Debe FALLAR sin la implementación (dto-acceso, servicio de acceso,
// POST /usuarios/acceso, @nestjs/jwt y guard de prueba).
// Patrón del repo: DB real vía src/db/conexion + app Nest con los
// mismos globales que src/main.ts (ValidationPipe, filtro, interceptores).
// Convención de ruta: POST /api/v1/usuarios/acceso (español, igual que
// POST /api/v1/usuarios/registro de MVP-005; no /login anglicado).
// Campo del token: `tokenAcceso` (camelCase español, consistente con el
// dominio del repo) dentro de `datos` junto al perfil mínimo `usuario`.
import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { usuarios } from '../../src/db/schema/usuarios';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';
import { obtenerSecretoJwt } from '../../src/usuarios/acceso.config';
import { AccesoGuard } from '../../src/usuarios/acceso.guard';
import { UsuariosModule } from '../../src/usuarios/usuarios.module';

process.env.JWT_SECRETO ??= 'secreto-pruebas-mvp006-solo-dev';

const urlConexion =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';
// Prefijo único por ejecución para no colisionar entre corridas ni borrar datos ajenos.
const prefijoEmail = `mvp006-${Date.now()}-`;
let contador = 0;

function nuevoEmail(): string {
  contador += 1;
  return `${prefijoEmail}${contador}@ejemplo.com`;
}

// Sonda temporal SOLO de prueba: ruta protegida con el guard real para
// verificar que un token expirado o manipulado es rechazado con 401.
// No se instala ningún guard global (eso es MVP-007).
@Controller('sonda-protegida-temporal')
class ControladorSondaTemporal {
  @Get()
  @UseGuards(AccesoGuard)
  leer(): { mensaje: string } {
    return { mensaje: 'acceso permitido' };
  }
}

interface DatosAcceso {
  tokenAcceso: string;
  usuario: { id: string; nombre: string; email: string };
}

interface CuerpoAcceso {
  exito: boolean;
  datos: DatosAcceso;
}

interface CuerpoError {
  exito: boolean;
  mensaje: string;
  errores?: string[];
  codigoEstado: number;
}

describe('Inicio de sesión JWT (MVP-006)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const correosCreados: string[] = [];

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [UsuariosModule],
      controllers: [ControladorSondaTemporal],
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
    jwtService = app.get(JwtService);
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

  async function registrar(nombre: string, email: string, password: string): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
  }

  async function acceder(cuerpo: unknown): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/usuarios/acceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  }

  async function leerSonda(token?: string): Promise<Response> {
    const url = await app.getUrl();
    return fetch(`${url}/api/v1/sonda-protegida-temporal`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it('credenciales válidas retornan 200 con JWT decodificable y perfil sin password_hash', async () => {
    const email = nuevoEmail();
    const registro = await registrar('Comerciante Login', email, 'Secreto123');
    expect(registro.status).toBe(201);
    correosCreados.push(email);

    const respuesta = await acceder({ email, password: 'Secreto123' });
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as CuerpoAcceso;
    expect(cuerpo.exito).toBe(true);
    expect(typeof cuerpo.datos.tokenAcceso).toBe('string');
    expect(cuerpo.datos.tokenAcceso.split('.')).toHaveLength(3);
    expect(cuerpo.datos.usuario.email).toBe(email);
    expect(cuerpo.datos.usuario.nombre).toBe('Comerciante Login');
    expect(typeof cuerpo.datos.usuario.id).toBe('string');
    expect('password_hash' in cuerpo.datos.usuario).toBe(false);
    expect('password' in cuerpo.datos.usuario).toBe(false);

    const verificado = jwtService.verify<{
      sub?: string;
      email?: string;
      iat?: number;
      exp?: number;
    }>(cuerpo.datos.tokenAcceso);
    expect(verificado.sub).toBe(cuerpo.datos.usuario.id);
    expect(verificado.email).toBe(email);
    const iat = verificado.iat;
    const exp = verificado.exp;
    if (typeof iat !== 'number' || typeof exp !== 'number') {
      throw new Error('El JWT debe traer iat y exp numéricos');
    }
    expect(exp - iat).toBe(3600);
  });

  it('contraseña errónea retorna 401 genérico en español', async () => {
    const email = nuevoEmail();
    const registro = await registrar('Clave Errónea', email, 'Secreto123');
    expect(registro.status).toBe(201);
    correosCreados.push(email);

    const respuesta = await acceder({ email, password: 'ClaveEquivocada999' });
    expect(respuesta.status).toBe(401);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(401);
    expect(cuerpo.mensaje).toBe('Credenciales inválidas');
  });

  it('email inexistente retorna el MISMO 401 sin filtrar existencia', async () => {
    const respuesta = await acceder({
      email: `inexistente-${prefijoEmail}@ejemplo.com`,
      password: 'CualquierClave123',
    });
    expect(respuesta.status).toBe(401);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(401);
    // Mensaje idéntico al de contraseña errónea: no revela si el email existe.
    expect(cuerpo.mensaje).toBe('Credenciales inválidas');
  });

  it('falta de campos retorna 400 en español', async () => {
    for (const cuerpoInvalido of [
      {},
      { email: nuevoEmail() },
      { password: 'Secreto123' },
      { email: 'no-es-un-correo', password: 'Secreto123' },
    ]) {
      const respuesta = await acceder(cuerpoInvalido);
      expect(respuesta.status).toBe(400);
      const cuerpo = (await respuesta.json()) as CuerpoError;
      expect(cuerpo.exito).toBe(false);
      expect(cuerpo.codigoEstado).toBe(400);
    }
  });

  it('rechaza propiedades no permitidas en las credenciales con 400', async () => {
    const respuesta = await acceder({
      email: nuevoEmail(),
      password: 'Secreto123',
      password_hash: 'no-debe-aceptarse',
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(400);
  });

  it('falla en producción si falta JWT_SECRETO', () => {
    const entornoOriginal = process.env.NODE_ENV;
    const secretoOriginal = process.env.JWT_SECRETO;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRETO;
      expect(() => obtenerSecretoJwt()).toThrow('JWT_SECRETO');
    } finally {
      process.env.NODE_ENV = entornoOriginal;
      if (secretoOriginal === undefined) {
        delete process.env.JWT_SECRETO;
      } else {
        process.env.JWT_SECRETO = secretoOriginal;
      }
    }
  });

  it('token manipulado es rechazado con 401 en ruta protegida', async () => {
    const email = nuevoEmail();
    const registro = await registrar('Token Manipulado', email, 'Secreto123');
    expect(registro.status).toBe(201);
    correosCreados.push(email);

    const acceso = await acceder({ email, password: 'Secreto123' });
    expect(acceso.status).toBe(200);
    const { tokenAcceso } = ((await acceso.json()) as CuerpoAcceso).datos;

    const ultimo = tokenAcceso.slice(-1);
    const manipulado = `${tokenAcceso.slice(0, -1)}${ultimo === 'a' ? 'b' : 'a'}`;
    const respuesta = await leerSonda(manipulado);
    expect(respuesta.status).toBe(401);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(401);
  });

  it('rechaza un encabezado Bearer con segmentos adicionales', async () => {
    const email = nuevoEmail();
    const registro = await registrar('Bearer Malformado', email, 'Secreto123');
    expect(registro.status).toBe(201);
    correosCreados.push(email);

    const acceso = await acceder({ email, password: 'Secreto123' });
    expect(acceso.status).toBe(200);
    const { tokenAcceso } = ((await acceso.json()) as CuerpoAcceso).datos;

    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/api/v1/sonda-protegida-temporal`, {
      headers: { Authorization: `Bearer ${tokenAcceso} segmento-extra` },
    });
    expect(respuesta.status).toBe(401);
    const cuerpo = (await respuesta.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(401);
  });

  it('token expirado es rechazado con 401 en ruta protegida y el válido pasa', async () => {
    const email = nuevoEmail();
    const registro = await registrar('Token Expirado', email, 'Secreto123');
    expect(registro.status).toBe(201);
    correosCreados.push(email);

    const acceso = await acceder({ email, password: 'Secreto123' });
    expect(acceso.status).toBe(200);
    const { tokenAcceso, usuario } = ((await acceso.json()) as CuerpoAcceso).datos;

    const valida = await leerSonda(tokenAcceso);
    expect(valida.status).toBe(200);

    // Expirado real: se firma con la configuración del mismo JwtService que
    // usa AccesoGuard, aislando esta comprobación de la configuración externa.
    const expirado = jwtService.sign({ sub: usuario.id, email }, { expiresIn: -10 });
    const rechazada = await leerSonda(expirado);
    expect(rechazada.status).toBe(401);
    const cuerpo = (await rechazada.json()) as CuerpoError;
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(401);

    const sinToken = await leerSonda();
    expect(sinToken.status).toBe(401);
  });
});
