import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { TenantContextService } from './services/tenant-context.service';
import { SubscriptionService } from './services/subscription.service';
import { FileUploadService } from './services/file-upload.service';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';

@Global()
@Module({
  providers: [
    PrismaService,
    RedisService,
    TenantContextService,
    SubscriptionService,
    FileUploadService,
    TenantContextInterceptor,
  ],
  exports: [
    PrismaService,
    RedisService,
    TenantContextService,
    SubscriptionService,
    FileUploadService,
    TenantContextInterceptor,
  ],
})
export class CommonModule {}
