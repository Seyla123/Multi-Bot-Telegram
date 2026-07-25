import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error('Unhandled Exception Caught by Filter:', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let data: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      // NestJS built-in validation errors often look like { message: [...], error: "...", statusCode: 400 }
      data = exceptionResponse;
    } else if (exception instanceof Error) {
      data = { message: exception.message };
    }

    response.status(status).json({
      status: false,
      data: data,
    });
  }
}
