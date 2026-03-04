import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { startOfDay, endOfDay, subDays } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Daily sales summary
   */
  async getDailySalesSummary(tenantId: string, date?: Date, skipCache = false) {
    const targetDate = date || new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const cacheKey = `reports:daily-sales:${start.toISOString()}`;
    
    if (!skipCache) {
      const cached = await this.redis.getTenantCache(tenantId, cacheKey);
      if (cached) return cached;
    }

    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        billedAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const totalSales = bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
    const totalTax = bills.reduce((sum, bill) => sum + Number(bill.taxAmount), 0);
    const totalBills = bills.length;

    const paymentBreakdown = bills.reduce((acc, bill) => {
      const method = bill.paymentMethod;
      acc[method] = (acc[method] || 0) + Number(bill.totalAmount);
      return acc;
    }, {} as Record<string, number>);

    const result = {
      date: targetDate,
      totalSales,
      totalTax,
      totalBills,
      averageBillValue: totalBills > 0 ? totalSales / totalBills : 0,
      paymentBreakdown,
    };

    // Cache for 1 hour
    await this.redis.setTenantCache(tenantId, cacheKey, result, 3600);

    return result;
  }

  /**
   * Sales summary for date range
   */
  async getSalesSummary(tenantId: string, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        billedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const totalSales = bills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);
    const totalTax = bills.reduce((sum, bill) => sum + Number(bill.taxAmount), 0);
    const totalBills = bills.length;

    const paymentBreakdown = bills.reduce((acc, bill) => {
      const method = bill.paymentMethod;
      acc[method] = (acc[method] || 0) + Number(bill.totalAmount);
      return acc;
    }, {} as Record<string, number>);

    const userPerformance = bills.reduce((acc, bill) => {
      const userName = bill.user.name;
      if (!acc[userName]) {
        acc[userName] = { totalSales: 0, billCount: 0 };
      }
      acc[userName].totalSales += Number(bill.totalAmount);
      acc[userName].billCount += 1;
      return acc;
    }, {} as Record<string, { totalSales: number; billCount: number }>);

    // GST breakdown by rate
    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: 'COMPLETED',
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    });

    const gstBreakdownMap = new Map<number, { taxableAmount: number; gstAmount: number }>();

    billItems.forEach((item) => {
      const gstRate = Number(item.gstRate);
      const quantity = Number(item.quantity);
      const price = Number(item.price);
      const taxableAmount = quantity * price;
      const gstAmount = Number(item.gstAmount);

      if (gstBreakdownMap.has(gstRate)) {
        const existing = gstBreakdownMap.get(gstRate)!;
        existing.taxableAmount += taxableAmount;
        existing.gstAmount += gstAmount;
      } else {
        gstBreakdownMap.set(gstRate, { taxableAmount, gstAmount });
      }
    });

    const gstBreakdown = Array.from(gstBreakdownMap.entries())
      .map(([gstRate, data]) => ({
        gstRate,
        taxableAmount: data.taxableAmount,
        gstAmount: data.gstAmount,
      }))
      .sort((a, b) => a.gstRate - b.gstRate);

    return {
      startDate,
      endDate,
      totalSales,
      totalTax,
      totalBills,
      averageBillValue: totalBills > 0 ? totalSales / totalBills : 0,
      paymentBreakdown,
      userPerformance,
      gstBreakdown,
    };
  }

  /**
   * Item-wise sales report
   */
  async getItemWiseSales(tenantId: string, startDate: Date, endDate: Date) {
    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: 'COMPLETED',
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const itemSales = billItems.reduce((acc, billItem) => {
      const itemId = billItem.itemId;
      if (!acc[itemId]) {
        acc[itemId] = {
          itemName: billItem.item.name,
          itemSku: billItem.item.sku,
          category: billItem.item.category.name,
          quantitySold: 0,
          totalRevenue: 0,
          totalCost: 0,
        };
      }
      acc[itemId].quantitySold += Number(billItem.quantity);
      acc[itemId].totalRevenue += Number(billItem.totalAmount);
      return acc;
    }, {} as Record<string, any>);

    // Calculate cost for each item
    for (const itemId in itemSales) {
      const batches = await this.prisma.billItemBatch.findMany({
        where: {
          billItem: {
            itemId,
            bill: {
              tenantId,
              status: 'COMPLETED',
              billedAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      const totalCost = batches.reduce(
        (sum, batch) => sum + Number(batch.quantityUsed) * Number(batch.costPrice),
        0,
      );

      itemSales[itemId].totalCost = totalCost;
      itemSales[itemId].profit = itemSales[itemId].totalRevenue - totalCost;
      itemSales[itemId].profitMargin =
        itemSales[itemId].totalRevenue > 0
          ? (itemSales[itemId].profit / itemSales[itemId].totalRevenue) * 100
          : 0;
    }

    return Object.values(itemSales).sort(
      (a: any, b: any) => b.totalRevenue - a.totalRevenue,
    );
  }

  /**
   * Current inventory report
   */
  async getCurrentInventory(tenantId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: {
          gt: 0,
        },
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            unit: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });

    const inventory = batches.reduce((acc, batch) => {
      // Skip ingredient batches - only process item batches
      if (!batch.itemId || !batch.item) return acc;
      
      const itemId = batch.itemId;
      if (!acc[itemId]) {
        acc[itemId] = {
          itemId: itemId, // Include itemId for frontend mapping
          itemName: batch.item.name,
          itemSku: batch.item.sku,
          category: batch.item.category.name,
          unit: batch.item.unit,
          totalQuantity: 0,
          totalValue: 0,
          batchCount: 0,
          oldestBatch: batch.purchaseDate,
        };
      }
      acc[itemId].totalQuantity += Number(batch.currentQuantity);
      acc[itemId].totalValue += Number(batch.currentQuantity) * Number(batch.costPrice);
      acc[itemId].batchCount += 1;
      return acc;
    }, {} as Record<string, any>);

    const inventoryArray = Object.values(inventory);
    const totalValue = inventoryArray.reduce((sum: number, item: any) => sum + item.totalValue, 0);

    return {
      items: inventoryArray,
      totalValue,
      totalItems: inventoryArray.length,
      totalBatches: batches.length,
    };
  }

  /**
   * Get current ingredient inventory with batch aggregation
   */
  async getIngredientInventory(tenantId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        ingredientId: { not: null },
        currentQuantity: { gt: 0 },
      },
      include: {
        ingredient: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });

    const inventory = batches.reduce((acc, batch) => {
      if (!batch.ingredientId || !batch.ingredient) return acc;
      
      const ingredientId = batch.ingredientId;
      if (!acc[ingredientId]) {
        acc[ingredientId] = {
          ingredientId,
          ingredientName: batch.ingredient.name,
          unit: batch.ingredient.unit,
          totalQuantity: 0,
          totalValue: 0,
          batchCount: 0,
          batches: [],
        };
      }
      acc[ingredientId].totalQuantity += Number(batch.currentQuantity);
      acc[ingredientId].totalValue += Number(batch.currentQuantity) * Number(batch.costPrice);
      acc[ingredientId].batchCount += 1;
      acc[ingredientId].batches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: Number(batch.currentQuantity),
        costPrice: Number(batch.costPrice),
        purchaseDate: batch.purchaseDate,
        expiryDate: batch.expiryDate,
      });
      return acc;
    }, {} as Record<string, any>);

    const ingredientsArray = Object.values(inventory);
    const totalValue = ingredientsArray.reduce((sum: number, ing: any) => sum + ing.totalValue, 0);

    return {
      ingredients: ingredientsArray,
      totalValue,
      totalIngredients: ingredientsArray.length,
      totalBatches: batches.length,
    };
  }

  /**
   * Inventory valuation report
   */
  async getInventoryValuation(tenantId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: {
          gt: 0,
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Group batches by item
    const itemMap = new Map<string, {
      itemName: string;
      category: string;
      totalQuantity: number;
      unit: string;
      totalValue: number;
    }>();

    batches.forEach((batch) => {
      // Skip ingredient batches - only process item batches
      if (!batch.itemId || !batch.item) return;
      
      const itemId = batch.itemId;
      const quantity = Number(batch.currentQuantity);
      const value = quantity * Number(batch.costPrice);

      if (itemMap.has(itemId)) {
        const existing = itemMap.get(itemId)!;
        existing.totalQuantity += quantity;
        existing.totalValue += value;
      } else {
        itemMap.set(itemId, {
          itemName: batch.item.name,
          category: batch.item.category?.name || 'Uncategorized',
          totalQuantity: quantity,
          unit: batch.item.unit || 'unit',
          totalValue: value,
        });
      }
    });

    const items = Array.from(itemMap.values());
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);

    return {
      items,
      totalValue,
      totalItems: items.length,
    };
  }

  /**
   * Top selling items
   */
  async getTopSellingItems(tenantId: string, days: number = 30, limit: number = 10) {
    const startDate = subDays(new Date(), days);
    const endDate = new Date();

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: 'COMPLETED',
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    const itemSales = billItems.reduce((acc, billItem) => {
      const itemId = billItem.itemId;
      if (!acc[itemId]) {
        acc[itemId] = {
          itemName: billItem.item.name,
          itemSku: billItem.item.sku,
          quantitySold: 0,
          revenue: 0,
        };
      }
      acc[itemId].quantitySold += Number(billItem.quantity);
      acc[itemId].revenue += Number(billItem.totalAmount);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(itemSales)
      .sort((a: any, b: any) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  }

  /**
   * Dashboard metrics
   */
  async getDashboardMetrics(tenantId: string, forceRefresh = false) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Today's sales
    const todaySales = await this.getDailySalesSummary(tenantId, today, forceRefresh);

    // Yesterday's sales
    const yesterday = subDays(today, 1);
    const yesterdaySales = await this.getDailySalesSummary(tenantId, yesterday, forceRefresh);

    // Low stock alerts
    const lowStockItems = await this.prisma.item.findMany({
      where: {
        tenantId,
        trackInventory: true,
        deletedAt: null,
      },
      include: {
        inventoryBatches: {
          where: {
            currentQuantity: {
              gt: 0,
            },
          },
        },
      },
    });

    const lowStockCount = lowStockItems.filter((item) => {
      const totalStock = item.inventoryBatches.reduce(
        (sum, batch) => sum + Number(batch.currentQuantity),
        0,
      );
      return totalStock < 10;
    }).length;

    // Pending KOTs
    const pendingKots = await this.prisma.kOT.count({
      where: {
        tenantId,
        status: {
          in: ['PENDING', 'PREPARING'],
        },
      },
    });

    return {
      todaySales,
      yesterdaySales,
      salesGrowth:
        (yesterdaySales as any).totalSales > 0
          ? (((todaySales as any).totalSales - (yesterdaySales as any).totalSales) / (yesterdaySales as any).totalSales) * 100
          : 0,
      lowStockCount,
      pendingKots,
    };
  }
}
