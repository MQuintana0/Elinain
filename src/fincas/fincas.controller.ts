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
import { FincasService } from './fincas.service';
import { CrearFincaDto } from './dto/crear-finca.dto';
import { ActualizarFincaDto } from './dto/actualizar-finca.dto';
import { FincaRespuestaDto } from './dto/finca-respuesta.dto';

@ApiTags('fincas')
@ApiBearerAuth()
@Controller('fincas')
export class FincasController {
  constructor(private readonly servicio: FincasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra una nueva finca geolocalizada asociada a un tercero' })
  @ApiCreatedResponse({ description: 'Finca registrada exitosamente', type: FincaRespuestaDto })
  crear(@Body() dto: CrearFincaDto): Promise<FincaRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista las fincas pertenecientes a los terceros del comerciante' })
  @ApiOkResponse({ description: 'Listado de fincas', type: [FincaRespuestaDto] })
  listar(): Promise<FincaRespuestaDto[]> {
    return this.servicio.listar();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtiene el detalle de una finca por ID' })
  @ApiOkResponse({ description: 'Finca encontrada', type: FincaRespuestaDto })
  @ApiNotFoundResponse({ description: 'Finca no encontrada' })
  buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<FincaRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza los datos o coordenadas de una finca' })
  @ApiOkResponse({ description: 'Finca actualizada', type: FincaRespuestaDto })
  @ApiNotFoundResponse({ description: 'Finca no encontrada' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarFincaDto,
  ): Promise<FincaRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una finca si no tiene contratos vinculados' })
  @ApiNoContentResponse({ description: 'Finca eliminada correctamente' })
  @ApiNotFoundResponse({ description: 'Finca no encontrada' })
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}
