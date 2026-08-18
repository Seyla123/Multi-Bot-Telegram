import { SetMetadata } from '@nestjs/common';

/**
 * When applied to a controller or route handler, instructs the global
 * TransformInterceptor to pass the response through unchanged.
 *
 * Use this for endpoints that manage their own response shape (e.g. the
 * Secret-Authenticated Service API which returns `{ success, data|message }`
 * instead of the standard `{ status, data }` envelope).
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
