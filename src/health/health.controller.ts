import { Controller, Get } from '@nestjs/common';

// Controlador público de salud: Render lo usa como health check.
// No expone dominio ni requiere autenticación.
@Controller('health')
export class HealthController {
  @Get()
  verificar(): { status: string } {
    return { status: 'ok' };
  }
}
