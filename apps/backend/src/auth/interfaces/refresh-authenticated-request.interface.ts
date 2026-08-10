import { Request } from 'express';
import { ValidationResponse } from './validation-response';

export interface RefreshAuthenticatedRequest extends Request {
  user: ValidationResponse & { refreshToken: string };
}
