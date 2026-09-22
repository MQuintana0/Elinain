import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { CostoRespuestaDto } from './costo-respuesta.dto';

export class PaginaCostosDto extends CrearPaginaRespuestaDto(
  CostoRespuestaDto,
  'PaginaCostosDto',
) {}
