// RED: este test verifica que el andamiaje modular carga.
// Debe FALLAR hasta que exista src/app.module.ts y los modulos esqueleto.
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('Arranque modular (MVP-001)', () => {
  it('el modulo raiz de la aplicacion carga sin errores', async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(modulo).toBeDefined();
    expect(modulo.get(AppModule)).toBeDefined();
  });
});
