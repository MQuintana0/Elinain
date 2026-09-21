import { CrearPaginaRespuestaDto } from '../../common/dto/pagina-respuesta.dto';
import { ContratoRespuestaDto } from './contrato-respuesta.dto';

export class PaginaContratosDto extends CrearPaginaRespuestaDto(
  ContratoRespuestaDto,
  'PaginaContratosDto',
) {}
