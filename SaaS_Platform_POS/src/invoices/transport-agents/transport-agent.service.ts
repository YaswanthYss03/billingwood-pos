import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateTransportAgentDto } from './dto/create-transport-agent.dto';
import { UpdateTransportAgentDto } from './dto/update-transport-agent.dto';

@Injectable()
export class TransportAgentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new transport agent for a location
   */
  async create(tenantId: string, dto: CreateTransportAgentDto) {
    // Verify location belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found or does not belong to your tenant');
    }

    // Check for duplicate agent name in the same location
    const existing = await this.prisma.transportAgent.findUnique({
      where: {
        locationId_agentName: {
          locationId: dto.locationId,
          agentName: dto.agentName,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A transport agent with this name already exists for this location');
    }

    // Create transport agent
    return this.prisma.transportAgent.create({
      data: {
        tenantId,
        locationId: dto.locationId,
        agentName: dto.agentName,
        transporterId: dto.transporterId,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        defaultMode: dto.defaultMode || 'Road',
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Get all transport agents for a location
   */
  async findAll(tenantId: string, locationId: string) {
    // Validate required parameter
    if (!locationId) {
      return [];
    }

    // Verify location belongs to tenant
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
    });

    // If location doesn't exist or doesn't belong to tenant, return empty array
    // This is more RESTful than throwing 404
    if (!location) {
      return [];
    }

    return this.prisma.transportAgent.findMany({
      where: { tenantId, locationId, isActive: true },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [
        { agentName: 'asc' },
      ],
    });
  }

  /**
   * Get a single transport agent
   */
  async findOne(tenantId: string, id: string) {
    const agent = await this.prisma.transportAgent.findFirst({
      where: { id, tenantId },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Transport agent not found');
    }

    return agent;
  }

  /**
   * Update transport agent
   */
  async update(tenantId: string, id: string, dto: UpdateTransportAgentDto) {
    const agent = await this.findOne(tenantId, id);

    // Check for duplicate agent name if changing name
    if (dto.agentName && dto.agentName !== agent.agentName) {
      const existing = await this.prisma.transportAgent.findUnique({
        where: {
          locationId_agentName: {
            locationId: agent.locationId,
            agentName: dto.agentName,
          },
        },
      });

      if (existing) {
        throw new ConflictException('A transport agent with this name already exists for this location');
      }
    }

    return this.prisma.transportAgent.update({
      where: { id },
      data: {
        agentName: dto.agentName,
        transporterId: dto.transporterId,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        defaultMode: dto.defaultMode,
        isActive: dto.isActive,
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Delete transport agent (soft delete)
   */
  async remove(tenantId: string, id: string) {
    const agent = await this.findOne(tenantId, id);

    // Check if agent is being used in any invoices
    const invoiceCount = await this.prisma.invoice.count({
      where: { transportAgentId: id },
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        `Cannot delete this transport agent as it is used in ${invoiceCount} invoice(s). You can deactivate it instead.`,
      );
    }

    // Soft delete (set isActive = false)
    return this.prisma.transportAgent.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
