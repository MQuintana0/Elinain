import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { CicloRespuestaDto } from './ciclo-respuesta.dto';

export class PaginaCiclosDto extends CrearPaginaRespuestaDto(
  CicloRespuestaDto,
  'PaginaCiclosDto',
) {}
