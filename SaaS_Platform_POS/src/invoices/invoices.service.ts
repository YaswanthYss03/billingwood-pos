import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { InvoiceSettingsResolver } from './services/invoice-settings-resolver.service';
import { InventoryService } from '../inventory/inventory.service';
import { 
  CreateInvoiceDto, 
  UpdateInvoiceDto, 
  RecordPaymentDto,
  QueryInvoiceDto 
} from './dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private settingsResolver: InvoiceSettingsResolver,
    private inventoryService: InventoryService,
  ) {}

  /**
   * Generate invoice number respecting location-specific numbering configuration
   */
  private async generateInvoiceNumber(
    tenantId: string,
    locationId: string,
    tx?: any
  ): Promise<string> {
    // Get location-specific numbering settings
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      tenantId,
      locationId
    );
    
    const { prefix, format, sequenceLength, resetFrequency } = settings.numbering;
    
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Build prefix based on format
    let keyPrefix = prefix;
    if (format.includes('{YYYYMM}')) {
      keyPrefix += year + month;
    } else if (format.includes('{YYYY}')) {
      keyPrefix += year;
    }

    // Try Redis-based counter first (FAST path)
    if (this.redis.isEnabled()) {
      try {
        const counterKey = `invoice_counter:${tenantId}:${locationId}:${keyPrefix}`;
        
        let sequence = await this.redis.increment(counterKey);
        
        // If first increment, sync with DB
        if (sequence === 1) {
          const prismaClient = tx || this.prisma;
          const lastInvoice = await prismaClient.invoice.findFirst({
            where: {
              tenantId,
              locationId,
              invoiceNumber: { startsWith: keyPrefix },
            },
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true },
          });

          if (lastInvoice) {
            const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-sequenceLength));
            await this.redis.setCounter(counterKey, lastSequence);
            sequence = await this.redis.increment(counterKey);
            this.logger.log(`Synced invoice counter for ${keyPrefix} from DB: ${lastSequence} -> ${sequence}`);
          }
        }
        
        // Set TTL based on reset frequency
        if (sequence === 1) {
          let ttl: number;
          if (resetFrequency === 'YEARLY') {
            const nextYear = new Date(now.getFullYear() + 1, 0, 1);
            ttl = Math.floor((nextYear.getTime() - now.getTime()) / 1000);
          } else if (resetFrequency === 'MONTHLY') {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            ttl = Math.floor((nextMonth.getTime() - now.getTime()) / 1000);
          } else {
            ttl = 31536000; // 1 year for NEVER
          }
          await this.redis.client.expire(counterKey, ttl);
        }
        
        return `${keyPrefix}${String(sequence).padStart(sequenceLength, '0')}`;
      } catch (error) {
        this.logger.warn('Redis counter failed, falling back to DB', error);
      }
    }
    
    // Fallback: DB-based generation
    const prismaClient = tx || this.prisma;
    const lastInvoice = await prismaClient.invoice.findFirst({
      where: {
        tenantId,
        locationId,
        invoiceNumber: { startsWith: keyPrefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-sequenceLength));
      sequence = lastSequence + 1;
    }

    return `${keyPrefix}${String(sequence).padStart(sequenceLength, '0')}`;
  }

  /**
   * Create a new invoice
   */
  async create(
    tenantId: string,
    userId: string,
    locationId: string,
    dto: CreateInvoiceDto
  ) {
    // Resolve settings for this location
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      tenantId,
      locationId
    );

    // Check if invoicing is enabled for this location
    if (!settings.enabled) {
      throw new ForbiddenException('Invoicing is not enabled for this location');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const invoiceNumber = await this.generateInvoiceNumber(tenantId, locationId);

    // Get template config
    const templateConfig = await this.settingsResolver.getTemplateConfig(
      tenantId,
      locationId,
      dto.templateId
    );

    // Create invoice in transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          tenantId,
          locationId,
          customerId: dto.customerId,
          bankAccountId: dto.bankAccountId || null,
          transportAgentId: dto.transportAgentId || null,
          invoiceNumber,
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: new Date(dto.dueDate),
          paymentTerms: dto.paymentTerms,
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          discount: dto.discount || 0,
          shippingCharge: dto.shippingCharge || 0,
          totalAmount: dto.totalAmount,
          status: dto.markAsSent ? InvoiceStatus.SENT : InvoiceStatus.DRAFT,
          templateId: dto.templateId,
          templateConfig: templateConfig as any,
          notes: dto.notes,
          termsConditions: dto.termsConditions || settings.textDefaults.termsConditions,
          sentAt: dto.markAsSent ? new Date() : null,
          // Transport & E-Way Bill Details
          challanNumber: dto.challanNumber || null,
          challanDate: dto.challanDate ? new Date(dto.challanDate) : null,
          ewayBillNumber: dto.ewayBillNumber || null,
          ewayBillDate: dto.ewayBillDate ? new Date(dto.ewayBillDate) : null,
          vehicleNumber: dto.vehicleNumber || null,
          lrNumber: dto.lrNumber || null,
          placeOfSupply: dto.placeOfSupply || null,
          // Snapshot customer details
          customerName: dto.customerSnapshot.name,
          customerPhone: dto.customerSnapshot.phone,
          customerEmail: dto.customerSnapshot.email || null,
          customerAddress: dto.customerSnapshot.address || null,
          customerCity: dto.customerSnapshot.city || null,
          customerState: dto.customerSnapshot.state || null,
          customerPincode: dto.customerSnapshot.pincode || null,
          customerGSTIN: dto.customerSnapshot.gstin || null,
        },
      });

      // Create invoice items
      const createdItems = await Promise.all(
        dto.items.map(async (item) => {
          // If itemId is provided, fetch the item to get HSN/SAC codes
          let hsnCode = item.hsnCode || null;
          let sacCode = item.sacCode || null;
          
          if (item.itemId && (!hsnCode && !sacCode)) {
            const itemData = await tx.item.findUnique({
              where: { id: item.itemId },
              select: { hsnCode: true, sacCode: true },
            });
            if (itemData) {
              hsnCode = itemData.hsnCode || hsnCode;
              sacCode = itemData.sacCode || sacCode;
            }
          }

          return tx.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              itemId: item.itemId || null,
              itemName: item.itemName,
              itemCode: item.itemCode || null,
              description: item.description || null,
              unit: item.unit || settings.textDefaults.defaultUnit,
              quantity: item.quantity,
              price: item.price,
              gstRate: item.gstRate,
              gstAmount: item.gstAmount,
              discount: item.discount || 0,
              totalAmount: item.totalAmount,
              hsnCode: hsnCode,
              sacCode: sacCode,
            },
          });
        })
      );

      // If marking as SENT, deduct inventory immediately
      if (dto.markAsSent) {
        await this.deductInventoryForInvoice(tx, tenantId, locationId, createdItems);
      }

      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: {
          items: true,
          customer: true,
          location: true,
          bankAccount: true,
          transportAgent: true,
        },
      });
    });

    return invoice;
  }

  /**
   * Deduct inventory for invoice items
   */
  private async deductInventoryForInvoice(
    tx: any,
    tenantId: string,
    locationId: string,
    items: any[]
  ) {
    // Filter items that have itemId (tracked inventory items)
    const trackedItems = items.filter(item => item.itemId);

    if (trackedItems.length === 0) {
      return;
    }

    // Get tenant settings for inventory method
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const inventoryMethod = (tenant?.settings as any)?.inventoryMethod || 'FIFO';

    // Deduct inventory and record batch allocations
    for (const item of trackedItems) {
      const allocations = await this.inventoryService.deductInventory(
        tenantId,
        item.itemId,
        item.quantity,
        locationId,
        inventoryMethod,
        tx
      );

      // Record batch allocation for audit trail
      if (allocations && allocations.length > 0) {
        const batchRecords = allocations.map(allocation => ({
          invoiceItemId: item.id,
          batchId: allocation.batchId,
          quantity: allocation.quantityUsed,
        }));

        await tx.invoiceItemBatch.createMany({
          data: batchRecords,
        });
      }
    }
  }

  /**
   * Find all invoices with filtering
   */
  async findAll(tenantId: string, filters: QueryInvoiceDto) {
    const {
      locationId,
      customerId,
      status,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (locationId) where.locationId = locationId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    
    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) where.invoiceDate.gte = new Date(fromDate);
      if (toDate) where.invoiceDate.lte = new Date(toDate);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          location: { select: { id: true, name: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one invoice by ID
   */
  async findOne(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          select: {
            id: true,
            itemName: true,
            itemCode: true,
            quantity: true,
            unit: true,
            price: true,
            gstRate: true,
            gstAmount: true,
            discount: true,
            totalAmount: true,
            hsnCode: true,
            sacCode: true,
            item: { select: { id: true, name: true, sku: true } },
          },
        },
        customer: { 
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
        location: { 
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            phone: true,
            email: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
            accountName: true,
          },
        },
        transportAgent: {
          select: {
            id: true,
            agentName: true,
            phone: true,
            email: true,
            contactPerson: true,
          },
        },
        payments: { 
          orderBy: { paymentDate: 'desc' },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            paymentDate: true,
            reference: true,
            notes: true,
          },
        },
      },
    });

    if (!invoice || invoice.tenantId !== tenantId || invoice.deletedAt !== null) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Update invoice (DRAFT only)
   */
  async update(tenantId: string, invoiceId: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Can only update DRAFT invoices');
    }

    // Update invoice and items
    return this.prisma.$transaction(async (tx) => {
      // Update invoice
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          paymentTerms: dto.paymentTerms,
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          discount: dto.discount,
          shippingCharge: dto.shippingCharge,
          totalAmount: dto.totalAmount,
          notes: dto.notes,
          termsConditions: dto.termsConditions,
        },
      });

      // If items provided, replace them
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId } });
        await tx.invoiceItem.createMany({
          data: dto.items.map((item: any) => ({
            invoiceId,
            itemId: item.itemId || null,
            itemName: item.itemName,
            itemCode: item.itemCode || null,
            description: item.description || null,
            unit: item.unit || 'PCS',
            quantity: item.quantity,
            price: item.price,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,
            discount: item.discount || 0,
            totalAmount: item.totalAmount,
            hsnCode: item.hsnCode || null,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true, customer: true },
      });
    });
  }

  /**
   * Mark invoice as SENT (deducts inventory)
   */
  async markAsSent(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId, deletedAt: null },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(`Cannot mark invoice as sent. Invoice is already in ${invoice.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Deduct inventory only if locationId exists
      if (invoice.locationId) {
        try {
          await this.deductInventoryForInvoice(
            tx,
            tenantId,
            invoice.locationId,
            invoice.items
          );
        } catch (error) {
          throw new BadRequestException(
            `Failed to deduct inventory: ${error.message || 'Insufficient stock or inventory error'}`
          );
        }
      }

      // Update status
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.SENT,
          sentAt: new Date(),
        },
        include: { items: true, customer: true },
      });
    });
  }

  /**
   * Record payment for invoice
   */
  async recordPayment(tenantId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId, deletedAt: null },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot record payment for cancelled invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          reference: dto.reference || null,
          notes: dto.notes || null,
        },
      });

      // Calculate total paid
      const allPayments = await tx.invoicePayment.findMany({
        where: { invoiceId },
      });
      const totalPaid = allPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount.toString()), 0);

      // Update invoice status
      let newStatus = invoice.status;
      let paidAt = invoice.paidAt;

      if (totalPaid >= parseFloat(invoice.totalAmount.toString())) {
        newStatus = InvoiceStatus.PAID;
        paidAt = new Date();
      } else if (totalPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus, paidAt },
      });

      return payment;
    });
  }

  /**
   * Cancel invoice (restores inventory if was SENT)
   */
  async cancel(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId, deletedAt: null },
      include: {
        items: {
          include: {
            batches: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel paid invoice');
    }

    return this.prisma.$transaction(async (tx) => {
      // If was SENT or PARTIALLY_PAID, restore inventory
      if (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
        // Collect all batch allocations from invoice items
        const allAllocations: any[] = [];

        for (const item of invoice.items) {
          if (item.batches && item.batches.length > 0) {
            const allocations = item.batches.map((batch: any) => ({
              batchId: batch.batchId,
              quantityUsed: Number(batch.quantity),
              costPrice: 0, // Not needed for restoration
            }));
            allAllocations.push(...allocations);
          }
        }

        // Restore inventory if there are batch allocations
        if (allAllocations.length > 0) {
          await this.inventoryService.restoreInventory(allAllocations, tx as any);
          this.logger.log(`Restored inventory for invoice ${invoiceId}: ${allAllocations.length} batches`);
        }
      }

      // Soft delete
      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELLED,
          deletedAt: new Date(),
        },
      });
    });
  }

  /**
   * Get dashboard metrics for invoices
   */
  async getDashboardMetrics(
    tenantId: string,
    filters?: {
      fromDate?: string;
      toDate?: string;
      locationId?: string;
    },
  ) {
    const whereClause: any = {
      tenantId,
      deletedAt: null,
    };

    if (filters?.locationId) {
      whereClause.locationId = filters.locationId;
    }

    if (filters?.fromDate || filters?.toDate) {
      whereClause.invoiceDate = {};
      if (filters.fromDate) {
        whereClause.invoiceDate.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        whereClause.invoiceDate.lte = new Date(filters.toDate);
      }
    }

    // Get all invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: whereClause,
      include: {
        payments: true,
      },
    });

    // Calculate metrics
    const totalInvoices = invoices.length;
    const draftCount = invoices.filter(inv => inv.status === InvoiceStatus.DRAFT).length;
    const sentCount = invoices.filter(inv => inv.status === InvoiceStatus.SENT).length;
    const paidCount = invoices.filter(inv => inv.status === InvoiceStatus.PAID).length;
    const partiallyPaidCount = invoices.filter(inv => inv.status === InvoiceStatus.PARTIALLY_PAID).length;
    const overdueCount = invoices.filter(inv => 
      inv.status !== InvoiceStatus.PAID && 
      inv.status !== InvoiceStatus.CANCELLED &&
      new Date(inv.dueDate) < new Date()
    ).length;

    // Calculate amounts
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    
    const partiallyPaidAmount = invoices
      .filter(inv => inv.status === InvoiceStatus.PARTIALLY_PAID)
      .reduce((sum, inv) => {
        const paid = inv.payments.reduce((pSum, payment) => pSum + Number(payment.amount), 0);
        return sum + paid;
      }, 0);

    const totalCollected = paidAmount + partiallyPaidAmount;
    const pendingAmount = totalAmount - totalCollected;

    // Status breakdown
    const statusBreakdown = [
      { status: 'DRAFT', count: draftCount, amount: invoices.filter(inv => inv.status === InvoiceStatus.DRAFT).reduce((sum, inv) => sum + Number(inv.totalAmount), 0) },
      { status: 'SENT', count: sentCount, amount: invoices.filter(inv => inv.status === InvoiceStatus.SENT).reduce((sum, inv) => sum + Number(inv.totalAmount), 0) },
      { status: 'PARTIALLY_PAID', count:partiallyPaidCount, amount: invoices.filter(inv => inv.status === InvoiceStatus.PARTIALLY_PAID).reduce((sum, inv) => sum + Number(inv.totalAmount), 0) },
      { status: 'PAID', count: paidCount, amount: paidAmount },
      { status: 'OVERDUE', count: overdueCount, amount: invoices.filter(inv => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED && new Date(inv.dueDate) < new Date()).reduce((sum, inv) => sum + Number(inv.totalAmount), 0) },
    ];

    // Recent invoices (last 10)
    const recentInvoices = await this.prisma.invoice.findMany({
      where: whereClause,
      orderBy: { invoiceDate: 'desc' },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        totalAmount: true,
        status: true,
      },
    });

    // Top customers by amount
    const customerStats = await this.prisma.invoice.groupBy({
      by: ['customerId', 'customerName'],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: 5,
    });

    return {
      summary: {
        totalInvoices,
        totalAmount,
        totalCollected,
        pendingAmount,
        overdueCount,
      },
      statusBreakdown,
      recentInvoices,
      topCustomers: customerStats.map(stat => ({
        customerId: stat.customerId,
        customerName: stat.customerName,
        totalAmount: stat._sum.totalAmount || 0,
        invoiceCount: stat._count.id,
      })),
    };
  }
}
