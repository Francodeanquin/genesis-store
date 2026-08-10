import { UserRole } from '@genesis/shared-types';

export interface ValidationResponse {
  id: string;
  email: string;
  role: UserRole;
  type: 'user' | 'customer';
}
