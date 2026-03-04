import { Module } from '@nestjs/common';
import { HsnSacService } from './hsn-sac.service';
import { HsnSacController } from './hsn-sac.controller';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [HsnSacController],
  providers: [HsnSacService, PrismaService],
  exports: [HsnSacService],
})
export class HsnSacModule {}
