// Controlador de usuarios (MVP-005, RF-1).
// Sin lógica de negocio: valida el DTO (vía ValidationPipe global) y delega
// al servicio. Ruta PÚBLICA por necesidad: sin credenciales registradas aún
// no existe JWT que exigir; MVP-006 (login) y MVP-007 (TenantGuard global)
// cerrarán el resto de rutas. Solo se crea POST /usuarios/registro.
// Se usa el nombre explícito `registro` (acción de autenticación, no CRUD
// puro) tal como lo espera odd/tasks/elinain-mvp.md.
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccesoService } from './acceso.service';
import { AccesoRespuestaDto } from './dto/acceso-respuesta.dto';
import { CredencialesAccesoDto } from './dto/acceso-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioRegistradoDto } from './dto/usuario-registrado.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly servicio: UsuariosService,
    private readonly acceso: AccesoService,
  ) {}

  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra el perfil del comerciante' })
  @ApiCreatedResponse({ description: 'Comerciante registrado', type: UsuarioRegistradoDto })
  registrar(@Body() dto: CrearUsuarioDto): Promise<UsuarioRegistradoDto> {
    return this.servicio.registrar(dto);
  }

  @Post('acceso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia sesión y emite el JWT de acceso' })
  @ApiOkResponse({ description: 'Acceso concedido', type: AccesoRespuestaDto })
  acceder(@Body() dto: CredencialesAccesoDto): Promise<AccesoRespuestaDto> {
    return this.acceso.iniciarSesion(dto);
  }
}
