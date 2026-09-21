import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class InterceptorRegistroPeticion implements NestInterceptor {
  private readonly registrador = new Logger('Peticion');

  interceptar(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const peticion = contexto.switchToHttp().getRequest<{
      method: string;
      url: string;
    }>();
    const metodo = peticion.method;
    const url = peticion.url;
    const inicio = Date.now();
    this.registrador.log(`Petición entrante: ${metodo} ${url}`);
    return siguiente.handle().pipe(
      tap({
        next: () => {
          const duracion = Date.now() - inicio;
          this.registrador.log(`Petición completada: ${metodo} ${url} en ${duracion}ms`);
        },
        error: (error: unknown) => {
          const duracion = Date.now() - inicio;
          const detalle = error instanceof Error ? ` - ${error.message}` : '';
          this.registrador.log(`Petición fallida: ${metodo} ${url} en ${duracion}ms${detalle}`);
        },
      }),
    );
  }

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    return this.interceptar(contexto, siguiente);
  }
}
