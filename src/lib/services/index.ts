// Service layer exports - minimal boilerplate
// Add your services here as needed

// Types and interfaces
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

// API Key service
export { APIKeyService } from './api-key.service';
export type { UserAPIKeys } from '@/lib/agent/types';
