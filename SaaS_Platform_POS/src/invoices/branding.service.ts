import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBrandingDto } from './dto/create-branding.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, locationId: string, dto: CreateBrandingDto) {
    // Check if branding with same name exists
    const existing = await this.prisma.branding.findUnique({
      where: {
        locationId_name: {
          locationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Branding with this name already exists');
    }

    // If isDefault is true, unset other defaults
    if (dto.isDefault) {
      await this.prisma.branding.updateMany({
        where: {
          locationId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.branding.create({
      data: {
        tenantId,
        locationId,
        ...dto,
      },
    });
  }

  async findAll(locationId: string) {
    return this.prisma.branding.findMany({
      where: {
        locationId,
        deletedAt: null,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const branding = await this.prisma.branding.findUnique({
      where: { id },
    });

    if (!branding || branding.deletedAt) {
      throw new NotFoundException('Branding not found');
    }

    return branding;
  }

  async findDefault(locationId: string) {
    return this.prisma.branding.findFirst({
      where: {
        locationId,
        isDefault: true,
        deletedAt: null,
      },
    });
  }

  async update(id: string, dto: UpdateBrandingDto) {
    const branding = await this.findOne(id);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.branding.updateMany({
        where: {
          locationId: branding.locationId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== branding.name) {
      const existing = await this.prisma.branding.findUnique({
        where: {
          locationId_name: {
            locationId: branding.locationId,
            name: dto.name,
          },
        },
      });

      if (existing) {
        throw new BadRequestException('Branding with this name already exists');
      }
    }

    return this.prisma.branding.update({
      where: { id },
      data: dto,
    });
  }

  async setDefault(id: string) {
    const branding = await this.findOne(id);

    // Unset other defaults
    await this.prisma.branding.updateMany({
      where: {
        locationId: branding.locationId,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    });

    // Set this as default
    return this.prisma.branding.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async remove(id: string) {
    const branding = await this.findOne(id);

    if (branding.isDefault) {
      throw new BadRequestException('Cannot delete the default branding. Set another branding as default first.');
    }

    return this.prisma.branding.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
