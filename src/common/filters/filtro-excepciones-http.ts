import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

interface CuerpoErrorHttp {
  message?: unknown;
  error?: string;
}

const MENSAJES_POR_ESTADO: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Solicitud inválida',
  [HttpStatus.UNAUTHORIZED]: 'No autorizado',
  [HttpStatus.FORBIDDEN]: 'Acceso denegado',
  [HttpStatus.NOT_FOUND]: 'Recurso no encontrado',
  [HttpStatus.CONFLICT]: 'Conflicto con el estado actual del recurso',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Entidad no procesable',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Error interno del servidor',
};

function aplanarMensajes(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.flatMap((elemento) => aplanarMensajes(elemento));
  }
  if (typeof valor === 'string') {
    return [valor];
  }
  if (typeof valor === 'object' && valor !== null) {
    const constraints = (valor as { constraints?: Record<string, string> }).constraints;
    if (constraints) {
      return Object.values(constraints);
    }
  }
  return [];
}

@Catch()
export class FiltroExcepcionesHttp implements ExceptionFilter {
  capturar(excepcion: unknown, anfitrion: ArgumentsHost): void {
    const contexto = anfitrion.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();

    let estado = HttpStatus.INTERNAL_SERVER_ERROR;
    let mensaje = MENSAJES_POR_ESTADO[estado];
    let errores: string[] | undefined;

    if (excepcion instanceof HttpException) {
      estado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse() as string | CuerpoErrorHttp;
      if (typeof cuerpo === 'string') {
        mensaje = cuerpo;
      } else if (cuerpo && typeof cuerpo === 'object') {
        const detalles = aplanarMensajes(cuerpo.message);
        if (detalles.length > 0) {
          errores = detalles;
          mensaje =
            estado === HttpStatus.BAD_REQUEST
              ? `Error de validación en la petición: ${detalles.join('; ')}`
              : detalles.join('; ');
        } else if (typeof cuerpo.error === 'string') {
          mensaje = cuerpo.error;
        } else {
          mensaje = MENSAJES_POR_ESTADO[estado] ?? excepcion.message;
        }
      } else {
        mensaje = excepcion.message;
      }
    } else if (excepcion instanceof Error) {
      mensaje = MENSAJES_POR_ESTADO[estado];
    }

    respuesta.status(estado).json({
      exito: false,
      mensaje,
      ...(errores ? { errores } : {}),
      codigoEstado: estado,
      ruta: peticion.url,
      marcaTiempo: new Date().toISOString(),
    });
  }

  catch(excepcion: unknown, anfitrion: ArgumentsHost): void {
    this.capturar(excepcion, anfitrion);
  }
}
