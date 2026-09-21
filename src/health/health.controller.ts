import { Controller, Get } from '@nestjs/common';
import { RutaPublica } from '../common/seguridad/ruta-publica.decorator';

// Controlador público de salud: Render lo usa como health check.
// No expone dominio ni requiere autenticación.
@Controller('health')
export class HealthController {
  @Get()
  @RutaPublica()
  verificar(): { status: string } {
    return { status: 'ok' };
  }
}
