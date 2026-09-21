import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TercerosService } from './terceros.service';
import { CrearTerceroDto } from './dto/crear-tercero.dto';
import { ActualizarTerceroDto } from './dto/actualizar-tercero.dto';
import { TerceroRespuestaDto } from './dto/tercero-respuesta.dto';

@ApiTags('terceros')
@ApiBearerAuth()
@Controller('terceros')
export class TercerosController {
  constructor(private readonly servicio: TercerosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un nuevo tercero asociado al comerciante' })
  @ApiCreatedResponse({ description: 'Tercero creado exitosamente', type: TerceroRespuestaDto })
  crear(@Body() dto: CrearTerceroDto): Promise<TerceroRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista los terceros pertenecientes al comerciante autenticado' })
  @ApiOkResponse({ description: 'Listado de terceros', type: [TerceroRespuestaDto] })
  listar(): Promise<TerceroRespuestaDto[]> {
    return this.servicio.listar();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtiene el detalle de un tercero por ID' })
  @ApiOkResponse({ description: 'Tercero encontrado', type: TerceroRespuestaDto })
  @ApiNotFoundResponse({ description: 'Tercero no encontrado' })
  buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<TerceroRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza los datos de un tercero' })
  @ApiOkResponse({ description: 'Tercero actualizado', type: TerceroRespuestaDto })
  @ApiNotFoundResponse({ description: 'Tercero no encontrado' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTerceroDto,
  ): Promise<TerceroRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un tercero si no tiene contratos vinculados' })
  @ApiNoContentResponse({ description: 'Tercero eliminado correctamente' })
  @ApiNotFoundResponse({ description: 'Tercero no encontrado' })
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}
