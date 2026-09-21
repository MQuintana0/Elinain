import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { VentaRespuestaDto } from './venta-respuesta.dto';

export class PaginaVentasDto extends CrearPaginaRespuestaDto(
  VentaRespuestaDto,
  'PaginaVentasDto',
) {}
