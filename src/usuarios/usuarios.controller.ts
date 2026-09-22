// Controlador de usuarios (MVP-005, RF-1).
// Sin lógica de negocio: valida el DTO (vía ValidationPipe global) y delega
// al servicio. Ruta PÚBLICA por necesidad: sin credenciales registradas aún
// no existe JWT que exigir; MVP-006 (login) y MVP-007 (TenantGuard global)
// cerrarán el resto de rutas. Solo se crea POST /usuarios/registro.
// Se usa el nombre explícito `registro` (acción de autenticación, no CRUD
// puro) tal como lo espera odd/tasks/elinain-mvp.md.
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AccesoService } from './acceso.service';
import { AccesoRespuestaDto } from './dto/acceso-respuesta.dto';
import { CredencialesAccesoDto } from './dto/acceso-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioRegistradoDto } from './dto/usuario-registrado.dto';
import { UsuariosService } from './usuarios.service';
import {
  RespuestaErrorConflictoDto,
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';
import { RutaPublica } from '../common/seguridad/ruta-publica.decorator';
import { CrearRespuestaExitosaDto } from '../common/dto/respuesta-exitosa.dto';

const RespuestaRegistroDto = CrearRespuestaExitosaDto(UsuarioRegistradoDto, 'RespuestaRegistroDto');
const RespuestaAccesoDto = CrearRespuestaExitosaDto(AccesoRespuestaDto, 'RespuestaAccesoDto');

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly servicio: UsuariosService,
    private readonly acceso: AccesoService,
  ) {}

  @Post('registro')
  @RutaPublica()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra el perfil del comerciante' })
  @ApiCreatedResponse({ description: 'Comerciante registrado', type: RespuestaRegistroDto })
  @ApiBadRequestResponse({
    description: 'Datos de registro inválidos o incompletos',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la petición: El email debe ser un correo válido; La contraseña debe tener al menos 8 caracteres',
      errores: [
        'El email debe ser un correo válido',
        'La contraseña debe tener al menos 8 caracteres',
      ],
      codigoEstado: 400,
      ruta: '/api/v1/usuarios/registro',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiConflictResponse({
    description: 'El correo electrónico ya se encuentra registrado',
    type: RespuestaErrorConflictoDto,
    example: {
      exito: false,
      mensaje: 'El correo electrónico ya se encuentra registrado',
      errores: ['El correo electrónico ya se encuentra registrado'],
      codigoEstado: 409,
      ruta: '/api/v1/usuarios/registro',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor',
    type: RespuestaErrorServidorDto,
    example: {
      exito: false,
      mensaje: 'Error interno del servidor',
      codigoEstado: 500,
      ruta: '/api/v1/usuarios/registro',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  registrar(@Body() dto: CrearUsuarioDto): Promise<UsuarioRegistradoDto> {
    return this.servicio.registrar(dto);
  }

  @Post('acceso')
  @RutaPublica()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión y emite el JWT de acceso' })
  @ApiOkResponse({ description: 'Acceso concedido', type: RespuestaAccesoDto })
  @ApiBadRequestResponse({
    description: 'Credenciales con formato inválido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: El email debe ser un correo válido',
      errores: ['El email debe ser un correo válido'],
      codigoEstado: 400,
      ruta: '/api/v1/usuarios/acceso',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales de acceso inválidas',
    type: RespuestaErrorNoAutorizadoDto,
    example: {
      exito: false,
      mensaje: 'Credenciales de acceso inválidas',
      errores: ['Credenciales de acceso inválidas'],
      codigoEstado: 401,
      ruta: '/api/v1/usuarios/acceso',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor',
    type: RespuestaErrorServidorDto,
    example: {
      exito: false,
      mensaje: 'Error interno del servidor',
      codigoEstado: 500,
      ruta: '/api/v1/usuarios/acceso',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  acceder(@Body() dto: CredencialesAccesoDto): Promise<AccesoRespuestaDto> {
    return this.acceso.iniciarSesion(dto);
  }
}
