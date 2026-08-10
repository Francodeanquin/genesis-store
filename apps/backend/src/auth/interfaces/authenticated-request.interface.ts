import { Request } from 'express';
import { ValidationResponse } from './validation-response';

export interface AuthenticatedRequest extends Request {
  user: ValidationResponse;
}
