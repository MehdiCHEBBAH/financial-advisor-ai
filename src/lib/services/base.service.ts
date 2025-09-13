import { ServiceError, ServiceResponse } from './index';

export abstract class BaseService {
  protected createSuccessResponse<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
    };
  }

  protected createErrorResponse(
    code: string,
    message: string,
    details?: unknown
  ): ServiceResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }

  protected handleError(error: unknown, context: string): ServiceResponse<never> {
    console.error(`Error in ${context}:`, error);
    
    if (error instanceof Error) {
      return this.createErrorResponse(
        'SERVICE_ERROR',
        `An error occurred in ${context}: ${error.message}`,
        error.stack
      );
    }
    
    return this.createErrorResponse(
      'UNKNOWN_ERROR',
      `An unknown error occurred in ${context}`,
      error
    );
  }

  protected validateRequired(value: unknown, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  }

  protected validateString(value: unknown, fieldName: string, minLength = 1): string {
    this.validateRequired(value, fieldName);
    
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    
    if (value.length < minLength) {
      throw new Error(`${fieldName} must be at least ${minLength} characters long`);
    }
    
    return value;
  }
}
