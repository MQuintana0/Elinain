import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { FincaRespuestaDto } from './finca-respuesta.dto';

export class PaginaFincasDto extends CrearPaginaRespuestaDto(
  FincaRespuestaDto,
  'PaginaFincasDto',
) {}
