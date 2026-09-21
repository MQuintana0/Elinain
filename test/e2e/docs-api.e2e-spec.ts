// RED (MVP-004): Swagger + Scalar con reflejo de DTOs.
// Debe FALLAR sin setup de documentación en src/main.ts
// (GET /docs 404, Scalar 404, esquema sin la regla de mínimo).
import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { configurarDocumentacion } from '../../src/main';
import {
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorValidacionDto,
} from '../../src/common/dto/respuesta-error.dto';

// DTO temporal de prueba: existe solo para verificar que las reglas
// de validación se reflejan en el esquema OpenAPI. No crea dominio (Fase 1+ intacta).
class CrearEjemploDocsDto {
  @ApiProperty({ description: 'Cantidad de ejemplo', minimum: 1, example: 10 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad!: number;
}

@ApiTags('ejemplo-docs')
@Controller('ejemplo-docs')
class ControladorEjemploDocs {
  @Post()
  @ApiOperation({ summary: 'Crea un ejemplo de documentación' })
  @ApiCreatedResponse({ description: 'Ejemplo creado', type: CrearEjemploDocsDto })
  @ApiBadRequestResponse({
    description: 'Error de validación',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Recurso no encontrado',
    type: RespuestaErrorNoEncontradoDto,
  })
  crear(@Body() dto: CrearEjemploDocsDto): CrearEjemploDocsDto {
    return dto;
  }
}

interface EsquemaPropiedad {
  minimum?: number;
  type?: string;
}

interface EsquemaDto {
  required?: string[];
  properties?: Record<string, EsquemaPropiedad>;
}

interface DocumentoOpenApi {
  openapi: string;
  info: { title: string };
  components?: { schemas?: Record<string, EsquemaDto> };
}

describe('Documentación API Swagger + Scalar (MVP-004)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [ControladorEjemploDocs],
    }).compile();
    app = modulo.createNestApplication();
    configurarDocumentacion(app);
    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('expone Swagger UI en /docs', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/docs`);
    expect(respuesta.status).toBe(200);
    const contenido = await respuesta.text();
    expect(respuesta.headers.get('content-type')).toMatch(/html/);
    expect(contenido.length).toBeGreaterThan(0);
  });

  it('expone la referencia Scalar en /referencia', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/referencia`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toMatch(/html/);
    const contenido = await respuesta.text();
    expect(contenido.length).toBeGreaterThan(0);
  });

  it('refleja la regla de mínimo del DTO en el esquema OpenAPI', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/docs-json`);
    expect(respuesta.status).toBe(200);
    const documento = (await respuesta.json()) as DocumentoOpenApi;
    expect(documento.info.title).toBe('Elinain API');
    const esquema = documento.components?.schemas?.['CrearEjemploDocsDto'];
    expect(esquema).toBeDefined();
    expect(esquema?.required).toContain('cantidad');
    expect(esquema?.properties?.['cantidad']?.minimum).toBe(1);
  });

  it('refleja esquemas de error tipados específicos (400 y 404) en OpenAPI', async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/docs-json`);
    expect(respuesta.status).toBe(200);
    const documento = (await respuesta.json()) as DocumentoOpenApi;
    const esquema400 = documento.components?.schemas?.['RespuestaErrorValidacionDto'];
    expect(esquema400).toBeDefined();
    expect(esquema400?.properties?.['codigoEstado']).toBeDefined();
    expect(esquema400?.properties?.['errores']).toBeDefined();

    const esquema404 = documento.components?.schemas?.['RespuestaErrorNoEncontradoDto'];
    expect(esquema404).toBeDefined();
    expect(esquema404?.properties?.['codigoEstado']).toBeDefined();
    expect(esquema404?.properties?.['mensaje']).toBeDefined();
  });
});
