import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { FiltroExcepcionesHttp } from './common/filters/filtro-excepciones-http';
import { InterceptorFormatoRespuesta } from './common/interceptors/interceptor-formato-respuesta';
import { InterceptorRegistroPeticion } from './common/interceptors/interceptor-registro-peticion';
import { cargarVariablesEntorno } from './common/cargar-entorno';

cargarVariablesEntorno();

export function configurarDocumentacion(app: INestApplication): OpenAPIObject {
  const configuracion = new DocumentBuilder()
    .setTitle('Elinain API')
    .setDescription('API del MVP de gestión ganadera multi-tenant Elinain')
    .setVersion('0.1.0')
    .build();
  const documento = SwaggerModule.createDocument(app, configuracion);
  SwaggerModule.setup('docs', app, documento);
  app.use('/referencia', apiReference({ content: documento }));
  return documento;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new FiltroExcepcionesHttp());
  app.useGlobalInterceptors(new InterceptorRegistroPeticion(), new InterceptorFormatoRespuesta());
  // Convención del proyecto: todos los endpoints versionados bajo api/v1.
  // La documentación (/docs, /referencia) queda fuera del prefijo.
  app.setGlobalPrefix('api/v1', { exclude: ['docs', 'referencia'] });
  configurarDocumentacion(app);
  const puerto = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(puerto, '0.0.0.0');
  console.log(`Aplicación Elinain escuchando en el puerto ${puerto}`);
}

if (require.main === module) {
  void bootstrap();
}
