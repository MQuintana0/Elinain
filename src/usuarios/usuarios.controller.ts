// Controlador de usuarios (MVP-005, RF-1, REFRESH-006).
// Sin lógica de negocio: valida el DTO (vía ValidationPipe global) y delega
// al servicio. Rutas PÚBLICAS de autenticación (registro, login, refresh, logout)
// quedan fuera de TenantGuard mediante @RutaPublica().
import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
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
import { RefrescarTokenDto } from './dto/refrescar-token.dto';
import { CerrarSesionDto } from './dto/cerrar-sesion.dto';
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
  @ApiOperation({ summary: 'Inicia sesión y emite el par de tokens (acceso y refresco)' })
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
  acceder(@Body() dto: CredencialesAccesoDto, @Req() req: Request): Promise<AccesoRespuestaDto> {
    const ip = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.acceso.iniciarSesion(dto, ip, userAgent);
  }

  @Post('refresh')
  @RutaPublica()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renueva los tokens de acceso y refresco mediante rotación (RTR)' })
  @ApiOkResponse({ description: 'Tokens renovados exitosamente', type: RespuestaAccesoDto })
  @ApiBadRequestResponse({
    description: 'Token de refresco inválido o con formato incorrecto',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: El token de refresco es obligatorio',
      errores: ['El token de refresco es obligatorio'],
      codigoEstado: 400,
      ruta: '/api/v1/usuarios/refresh',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token de refresco inválido, expirado o revocado por reutilización',
    type: RespuestaErrorNoAutorizadoDto,
    example: {
      exito: false,
      mensaje: 'Token de refresco inválido o expirado',
      errores: ['Token de refresco inválido o expirado'],
      codigoEstado: 401,
      ruta: '/api/v1/usuarios/refresh',
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
      ruta: '/api/v1/usuarios/refresh',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  refrescar(@Body() dto: RefrescarTokenDto, @Req() req: Request): Promise<AccesoRespuestaDto> {
    const ip = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.acceso.refrescar(dto, ip, userAgent);
  }

  @Post('logout')
  @RutaPublica()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierra la sesión revocando el token de refresco' })
  @ApiOkResponse({
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: { exito: true, mensaje: 'Sesión cerrada correctamente' },
    },
  })
  @ApiBadRequestResponse({
    description: 'Petición inválida',
    type: RespuestaErrorValidacionDto,
  })
  cerrarSesion(@Body() dto: CerrarSesionDto): Promise<{ exito: boolean; mensaje: string }> {
    return this.acceso.cerrarSesion(dto);
  }
}
