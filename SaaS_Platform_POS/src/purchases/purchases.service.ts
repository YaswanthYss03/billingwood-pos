import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate purchase number with unique timestamp to avoid conflicts
   */
  private async generatePurchaseNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const prefix = `PO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // Add timestamp and random component to ensure uniqueness in rapid succession
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Create a new purchase order
   */
  async create(tenantId: string, createPurchaseDto: CreatePurchaseDto) {
    const purchaseNumber = await this.generatePurchaseNumber(tenantId);

    // If vendorId provided, verify vendor exists (Professional Plan)
    if (createPurchaseDto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: {
          id: createPurchaseDto.vendorId,
          tenantId,
          isActive: true,
        },
      });

      if (!vendor) {
        throw new NotFoundException('Vendor not found or inactive');
      }
    }

    // Calculate total
    const totalAmount = createPurchaseDto.items.reduce((sum, item) => {
      return sum + item.quantity * item.costPrice;
    }, 0);

    return this.prisma.executeInTransaction(async (tx) => {
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          purchaseNumber,
          vendorId: createPurchaseDto.vendorId, // Professional Plan
          supplierName: createPurchaseDto.supplierName,
          invoiceNumber: createPurchaseDto.invoiceNumber,
          purchaseDate: createPurchaseDto.purchaseDate || new Date(),
          expectedDate: createPurchaseDto.expectedDate, // Professional Plan
          totalAmount: new Decimal(totalAmount),
          notes: createPurchaseDto.notes,
          status: 'DRAFT',
        },
      });

      // Create purchase items
      for (const item of createPurchaseDto.items) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            itemId: item.itemId,
            ingredientId: item.ingredientId,
            quantity: new Decimal(item.quantity),
            costPrice: new Decimal(item.costPrice),
            totalCost: new Decimal(item.quantity * item.costPrice),
          },
        });
      }

      // Return with items and vendor (if linked)
      return tx.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          items: {
            include: {
              item: true,
              ingredient: true,
            },
          },
          vendor: true, // Professional Plan
        },
      });
    });
  }

  /**
   *Send purchase order to vendor (Professional Plan)
   * Changes status from DRAFT to ORDERED
   */
  async sendPurchaseOrder(tenantId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      include: {
        vendor: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
    }

    if (purchase.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot send purchase order. Current status: ${purchase.status}`,
      );
    }

    const updated = await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'ORDERED',
        orderedDate: new Date(),
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        vendor: true,
      },
    });

    this.logger.log(`Purchase order ${purchase.purchaseNumber} sent to vendor`);

    return updated;
  }

  /**
   * Receive purchase and create inventory batches
   */
  async receivePurchase(
    tenantId: string,
    purchaseId: string,
    receivePurchaseDto: ReceivePurchaseDto,    locationId?: string,  ) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${purchaseId} not found`);
    }

    if (purchase.status !== 'DRAFT' && purchase.status !== 'ORDERED') {
      throw new BadRequestException(
        `Cannot receive purchase. Current status: ${purchase.status}`,
      );
    }

    return this.prisma.executeInTransaction(async (tx) => {
      // Update purchase status
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'RECEIVED',
          receivedDate: receivePurchaseDto.receivedDate || new Date(),
        },
      });

      // Create inventory batches for each item/ingredient
      for (const purchaseItem of purchase.items) {
        const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        await tx.inventoryBatch.create({
          data: {
            tenantId,
            itemId: purchaseItem.itemId,
            ingredientId: purchaseItem.ingredientId,
            purchaseId: purchase.id,
            locationId, // Multi-location support
            batchNumber,
            initialQuantity: purchaseItem.quantity,
            currentQuantity: purchaseItem.quantity,
            costPrice: purchaseItem.costPrice,
            purchaseDate: receivePurchaseDto.receivedDate || new Date(),
            expiryDate: null, // Can be enhanced later
          },
        });

        const entityType = purchaseItem.itemId ? 'item' : 'ingredient';
        const entityId = purchaseItem.itemId || purchaseItem.ingredientId;
        this.logger.log(
          `Created batch ${batchNumber} for ${entityType} ${entityId} with quantity ${purchaseItem.quantity}`,
        );
      }

      return tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          items: {
            include: {
              item: true,
              ingredient: true,
            },
          },
          inventoryBatches: true,
          vendor: true, // Professional Plan
        },
      });
    });
  }

  /**
   * Get all purchases
   */
  async findAll(tenantId: string, status?: PurchaseStatus) {
    return this.prisma.purchase.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        vendor: true, // Professional Plan
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get purchase by ID
   */
  async findOne(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: {
          include: {
            item: true,
          },
        },
        inventoryBatches: true,
        vendor: true, // Professional Plan
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Cancel purchase
   */
  async cancel(tenantId: string, id: string) {
    const purchase = await this.findOne(tenantId, id);

    if (purchase.status === 'RECEIVED') {
      throw new BadRequestException(
        'Cannot cancel a received purchase. Inventory has already been updated.',
      );
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  /**
   * Delete purchase
   */
  async remove(tenantId: string, id: string) {
    const purchase = await this.findOne(tenantId, id);

    if (purchase.status === 'RECEIVED') {
      throw new BadRequestException(
        'Cannot delete a received purchase. Cancel related bills first.',
      );
    }

    return this.prisma.purchase.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
