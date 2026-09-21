// RED (MVP-003): capa common/ transversal.
// Debe FALLAR sin filtros/interceptores ni ValidationPipe global
// (formato consistente en español, formato uniforme, logs por petición).
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Logger,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsNotEmpty, IsString } from 'class-validator';
import { FiltroExcepcionesHttp } from '../../src/common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from '../../src/common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from '../../src/common/interceptors/interceptor-registro-peticion';

class CrearEjemploDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;
}

@Controller('ejemplo-transversal')
class ControladorEjemplo {
  @Post()
  crear(@Body() dto: CrearEjemploDto): { eco: string } {
    return { eco: dto.nombre };
  }

  @Get('saludo')
  saludo(): { saludo: string } {
    return { saludo: 'hola' };
  }
}

describe('Capa transversal common/ (MVP-003)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [ControladorEjemplo],
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
    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('retorna error de validación con formato consistente en español (400)', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/ejemplo-transversal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      mensaje: string;
      errores?: string[];
      codigoEstado: number;
    };
    expect(cuerpo.exito).toBe(false);
    expect(cuerpo.codigoEstado).toBe(400);
    expect(typeof cuerpo.mensaje).toBe('string');
    expect(cuerpo.mensaje.toLowerCase()).toMatch(/validaci|obligatorio|nombre/);
    expect(Array.isArray(cuerpo.errores)).toBe(true);
    expect(cuerpo.errores?.length).toBeGreaterThan(0);
  });

  it('rechaza propiedades no permitidas (whitelist + forbidNonWhitelisted)', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/ejemplo-transversal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Lote 1', intruso: 'x' }),
    });
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      mensaje: string;
    };
    expect(cuerpo.exito).toBe(false);
    expect(typeof cuerpo.mensaje).toBe('string');
  });

  it('responde con formato uniforme en peticiones exitosas', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/ejemplo-transversal/saludo`);
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      exito: boolean;
      datos: unknown;
    };
    expect(cuerpo.exito).toBe(true);
    expect(cuerpo.datos).toEqual({ saludo: 'hola' });
  });

  it('emite logs por petición', async () => {
    const espionaje = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    try {
      const url = await app.getUrl();
      const respuesta = await fetch(`${url}/ejemplo-transversal/saludo`);
      expect(respuesta.status).toBe(200);
      await respuesta.json();
      expect(espionaje).toHaveBeenCalled();
    } finally {
      espionaje.mockRestore();
    }
  });
});
