import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data): ApiResponse<T> => {
        if (data && typeof data === 'object' && 'data' in data) {
          // Paginated responses have a meta object with totalPages — keep them wrapped
          // so the frontend receives PaginatedResult as r.data.data
          const meta = (data as any).meta;
          const isPaginated =
            meta && typeof meta === 'object' && 'totalPages' in meta;
          if (isPaginated) {
            return { success: true, data: data as T };
          }
          // Single-object / array / stats responses — spread so frontend gets the
          // actual value at r.data.data instead of r.data.data.data
          return { success: true, data: (data as any).data as T, ...(data as any) };
        }
        return { success: true, data: data as T };
      }),
    );
  }
}
