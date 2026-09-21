import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { CompraRespuestaDto } from './compra-respuesta.dto';

export class PaginaComprasDto extends CrearPaginaRespuestaDto(
  CompraRespuestaDto,
  'PaginaComprasDto',
) {}
