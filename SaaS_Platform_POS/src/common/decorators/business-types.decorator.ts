import { SetMetadata } from '@nestjs/common';

export const BUSINESS_TYPES_KEY = 'businessTypes';

/**
 * Decorator to restrict access to specific business types
 * Usage: @BusinessTypes('RETAIL', 'GROCERY')
 */
export const BusinessTypes = (...types: string[]) => SetMetadata(BUSINESS_TYPES_KEY, types);
