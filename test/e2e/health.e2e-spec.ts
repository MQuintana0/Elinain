// RED (DEP-002): health check público para Render.
// Debe FALLAR hasta que exista src/health con GET /health → 200 {status:'ok'}.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthController } from '../../src/health/health.controller';

describe('Health check (DEP-002)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it("responde GET /health con 200 y {status:'ok'}", async () => {
    const url = await app.getUrl();
    const respuesta = await fetch(`${url}/health`);
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as { status: string };
    expect(cuerpo).toEqual({ status: 'ok' });
  });
});
