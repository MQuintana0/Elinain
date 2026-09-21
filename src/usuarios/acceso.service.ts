// Servicio de acceso (MVP-006, H1).
// Valida credenciales contra el hash bcrypt persistido por MVP-005 y emite
// el JWT firmado (la firma y expiración las aplica JwtModule). No persiste
// nada: solo lee vía UsuariosRepository.
// Seguridad: email inexistente y contraseña errónea responden el MISMO 401
// genérico, y el email inexistente también pasa por bcrypt.compare (contra
// un hash señuelo) para no filtrar existencia ni por tiempo de respuesta.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccesoRespuestaDto } from './dto/acceso-respuesta.dto';
import { CredencialesAccesoDto } from './dto/acceso-usuario.dto';
import { UsuariosRepository } from './usuarios.repository';

// Hash bcrypt válido (coste 10) usado solo como señuelo de temporización
// cuando el email no existe. Ninguna cuenta real lo usa; aunque se conociera
// su preimagen, el acceso seguiría rechazado porque no hay fila de usuario.
const HASH_SENUELO_INEXISTENTE = '$2b$10$TdahXtB8smQmRvgEYu.x0.1DdoER2hmZvEWOss4iZcEtFpy.wJlFy';

@Injectable()
export class AccesoService {
  constructor(
    private readonly repositorio: UsuariosRepository,
    private readonly jwtService: JwtService,
  ) {}

  async iniciarSesion(dto: CredencialesAccesoDto): Promise<AccesoRespuestaDto> {
    const fila = await this.repositorio.buscarPorEmail(dto.email);
    const valida = await bcrypt.compare(
      dto.password,
      fila?.password_hash ?? HASH_SENUELO_INEXISTENTE,
    );
    if (!fila || !valida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const tokenAcceso = await this.jwtService.signAsync({
      sub: fila.id,
      email: fila.email,
    });
    return {
      tokenAcceso,
      usuario: { id: fila.id, nombre: fila.nombre, email: fila.email },
    };
  }
}
