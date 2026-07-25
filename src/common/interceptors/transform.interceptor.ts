import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  status: boolean;
  data: T | null;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T> | any> {
    if (context.getType() === ('telegraf' as any)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        status: true,
        data: data !== undefined ? data : null,
      })),
    );
  }
}
