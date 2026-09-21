import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { TerceroRespuestaDto } from './tercero-respuesta.dto';

export class PaginaTercerosDto extends CrearPaginaRespuestaDto(
  TerceroRespuestaDto,
  'PaginaTercerosDto',
) {}
