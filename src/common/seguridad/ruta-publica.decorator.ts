import { SetMetadata } from '@nestjs/common';

export const RUTA_PUBLICA_METADATA = 'ruta_publica';

/** Marca únicamente el handler que no necesita identidad tenant. */
export const RutaPublica = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RUTA_PUBLICA_METADATA, true);
