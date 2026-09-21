import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function tieneFormatoUniforme(valor: unknown): boolean {
  return typeof valor === 'object' && valor !== null && 'exito' in valor && 'datos' in valor;
}

@Injectable()
export class InterceptorFormatoRespuesta implements NestInterceptor {
  interceptar(_contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    return siguiente.handle().pipe(
      map((datos: unknown) => {
        if (tieneFormatoUniforme(datos)) {
          return datos;
        }
        return { exito: true, datos };
      }),
    );
  }

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    return this.interceptar(contexto, siguiente);
  }
}
