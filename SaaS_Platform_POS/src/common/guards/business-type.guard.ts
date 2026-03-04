import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BUSINESS_TYPES_KEY } from '../decorators/business-types.decorator';

@Injectable()
export class BusinessTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<string[]>(BUSINESS_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTypes || requiredTypes.length === 0) {
      return true; // No business type restriction
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenant || !user.tenant.businessType) {
      throw new ForbiddenException('Business type information not available');
    }

    const userBusinessType = user.tenant.businessType;

    if (!requiredTypes.includes(userBusinessType)) {
      throw new ForbiddenException(
        `This feature is only available for ${requiredTypes.join(', ')} businesses. Your business type is ${userBusinessType}.`,
      );
    }

    return true;
  }
}
