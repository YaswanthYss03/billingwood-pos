import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { RedisService } from '../../common/services/redis.service';
import { InventoryService } from '../../inventory/inventory.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private inventoryService: InventoryService,
  ) {}

  async create(tenantId: string, createItemDto: CreateItemDto) {
    const item = await this.prisma.item.create({
      data: {
        tenantId,
        categoryId: createItemDto.categoryId,
        name: createItemDto.name,
        description: createItemDto.description,
        sku: createItemDto.sku,
        itemType: createItemDto.itemType || 'SIMPLE',
        price: createItemDto.price,
        gstRate: createItemDto.gstRate || 0,
        trackInventory: createItemDto.trackInventory ?? true,
        inventoryMode: createItemDto.inventoryMode || 'AUTO',
        unit: createItemDto.unit || 'PCS',
      },
      include: {
        category: true,
        recipes: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Cache the new item immediately (5 min TTL)
    await this.redis.set(`item:${tenantId}:${item.id}`, {
      id: item.id,
      name: item.name,
      price: item.price,
      gstRate: item.gstRate,
      trackInventory: item.trackInventory,
      inventoryMode: (item as any).inventoryMode,
      isActive: item.isActive,
    }, 300);

    // Invalidate tenant items cache
    await this.redis.delTenantCache(tenantId, 'items');

    return item;
  }

  async findAll(tenantId: string, categoryId?: string) {
    const cacheKey = categoryId ? `items:category:${categoryId}` : 'items';
    
    // Try cache first
    const cached = await this.redis.getTenantCache(tenantId, cacheKey);
    if (cached) {
      return cached;
    }

    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: true,
        recipes: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Cache for 30 minutes
    await this.redis.setTenantCache(tenantId, cacheKey, items, 1800);

    return items;
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: true,
        recipes: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async findByCategory(tenantId: string, categoryId: string) {
    return this.findAll(tenantId, categoryId);
  }

  async update(tenantId: string, id: string, updateItemDto: UpdateItemDto) {
    await this.findOne(tenantId, id); // Ensure exists

    const item = await this.prisma.item.update({
      where: { id },
      data: updateItemDto,
      include: {
        category: true,
        recipes: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Update individual item cache
    await this.redis.set(`item:${tenantId}:${item.id}`, {
      id: item.id,
      name: item.name,
      price: item.price,
      gstRate: item.gstRate,
      trackInventory: item.trackInventory,
      inventoryMode: (item as any).inventoryMode,
      isActive: item.isActive,
    }, 300);

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return item;
  }

  async remove(tenantId: string, id: string) {
    const item = await this.findOne(tenantId, id); // Ensure exists

    const updated = await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Remove from cache
    await this.redis.del(`item:${tenantId}:${id}`);
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return updated;
  }

  async toggleStatus(tenantId: string, id: string) {
    const item = await this.findOne(tenantId, id);

    const updated = await this.prisma.item.update({
      where: { id },
      data: { isActive: !item.isActive },
    });

    // Update individual item cache
    await this.redis.set(`item:${tenantId}:${id}`, {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      gstRate: updated.gstRate,
      trackInventory: updated.trackInventory,
      inventoryMode: (updated as any).inventoryMode,
      isActive: updated.isActive,
    }, 300);

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return updated;
  }

  async getCurrentStock(tenantId: string, itemId: string, locationId?: string): Promise<number> {
    const item = await this.findOne(tenantId, itemId);

    if (!item.trackInventory) {
      return Infinity; // Unlimited stock for non-tracked items
    }

    // Professional plan: Check if inventory batches exist for this item
    // If batches exist, always calculate from batches (batch-based inventory)
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        itemId,
        ...(locationId && { locationId }),
        currentQuantity: { gt: 0 },
      },
    });

    // If batches exist, use batch-based calculation (Professional Plan)
    if (batches.length > 0) {
      const totalStock = batches.reduce((sum, batch) => {
        return sum + Number(batch.currentQuantity);
      }, 0);
      return totalStock;
    }

    // No batches found - use simple quantity field (Starter Plan)
    // Return 0 if quantity is null/undefined
    return Number(item.quantity || 0);
  }

  /**
   * Update item quantity (Starter Plan - simple quantity management)
   * @param tenantId Tenant ID
   * @param itemId Item ID
   * @param quantity New quantity to set (or amount to add if isIncrement=true)
   * @param isIncrement If true, adds to current quantity. If false, sets absolute value.
   */
  async updateQuantity(tenantId: string, itemId: string, quantity: number, isIncrement: boolean = true) {
    await this.findOne(tenantId, itemId); // Ensure item exists

    const updateData = isIncrement
      ? { quantity: { increment: quantity } }
      : { quantity };

    const item = await this.prisma.item.update({
      where: { id: itemId },
      data: updateData,
    });

    // Invalidate cache
    await this.redis.del(`item:${tenantId}:${itemId}`);
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return item;
  }

  /**
   * Pre-warm cache with active items for a tenant
   * Call this on app startup or when tenant logs in
   */
  async preWarmCache(tenantId: string): Promise<void> {
    try {
      const items = await this.prisma.item.findMany({
        where: {
          tenantId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          price: true,
          gstRate: true,
          trackInventory: true,
          inventoryMode: true,
          isActive: true,
        },
      });

      // Cache each item individually (5 minutes TTL)
      await Promise.all(
        items.map(item =>
          this.redis.set(`item:${tenantId}:${item.id}`, item, 300)
        )
      );

      console.log(`Pre-warmed cache with ${items.length} items for tenant ${tenantId}`);
    } catch (error) {
      console.error('Failed to pre-warm cache:', error);
    }
  }

  /**
   * Prepare dishes from ingredients (Professional Plan)
   * This deducts ingredients based on recipe and adds to item quantity
   */
  async prepareDishes(tenantId: string, itemId: string, quantity: number) {
    const item = await this.findOne(tenantId, itemId);

    // Get tenant subscription plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionPlan: true },
    });

    const isStarterPlan = tenant?.subscriptionPlan === 'STARTER' || tenant?.subscriptionPlan === 'FREE_TRIAL';

    // Check if item has a recipe
    const recipe = await this.prisma.recipe.findFirst({
      where: {
        finishedGoodId: itemId,
        tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`No recipe found for item ${item.name}`);
    }

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Calculate and validate ingredient availability
      const ingredientRequirements: any[] = [];
      const shortages: any[] = [];
      const batchAllocations: Map<string, any[]> = new Map();

      console.log(`[PrepareDishes] Item: ${item.name}, Recipe: ${recipe.name}, Quantity: ${quantity}`);
      console.log(`[PrepareDishes] Recipe ingredients:`, recipe.ingredients.map(ing => ({
        id: ing.ingredientId,
        name: ing.ingredient.name,
        quantity: Number(ing.quantity),
      })));

      for (const recipeIng of recipe.ingredients) {
        const requiredQty = Number(recipeIng.quantity) * quantity;

        if (isStarterPlan) {
          // Starter Plan: Simple quantity check
          const ingredient = await tx.ingredient.findUnique({
            where: { id: recipeIng.ingredientId },
          });

          if (!ingredient) {
            throw new NotFoundException(`Ingredient ${recipeIng.ingredient.name} not found`);
          }

          const available = Number(ingredient.quantity);

          if (available < requiredQty) {
            shortages.push({
              name: ingredient.name,
              required: requiredQty,
              available,
              shortage: requiredQty - available,
              unit: recipeIng.unit,
            });
          }

          ingredientRequirements.push({
            ingredientId: ingredient.id,
            name: ingredient.name,
            required: requiredQty,
            unit: recipeIng.unit,
          });
        } else {
          // Professional Plan: Check and allocate from batches using FIFO
          try {
            const allocations = await this.inventoryService.allocateIngredientBatchesFIFO(
              tenantId,
              recipeIng.ingredientId,
              requiredQty,
              undefined, // locationId - can be added later
              tx,
            );
            batchAllocations.set(recipeIng.ingredientId, allocations);
            ingredientRequirements.push({
              ingredientId: recipeIng.ingredientId,
              name: recipeIng.ingredient.name,
              required: requiredQty,
              unit: recipeIng.unit,
            });
          } catch (error) {
            // Extract available quantity from error message if present
            let available = 0;
            const availableMatch = error.message?.match(/Available: (\d+\.?\d*)/);
            if (availableMatch) {
              available = parseFloat(availableMatch[1]);
            }
            
            shortages.push({
              name: recipeIng.ingredient.name,
              required: requiredQty,
              available,
              shortage: requiredQty - available,
              unit: recipeIng.unit,
              error: error.message,
            });
          }
        }
      }

      if (shortages.length > 0) {
        throw new Error(
          `Insufficient ingredients: ${shortages.map(s => `${s.name} (need ${s.required}${s.unit}, have ${s.available}${s.unit})`).join(', ')}`
        );
      }

      // Deduct ingredients
      if (isStarterPlan) {
        // Starter Plan: Simple quantity decrement
        for (const req of ingredientRequirements) {
          await tx.ingredient.update({
            where: { id: req.ingredientId },
            data: {
              quantity: {
                decrement: req.required,
              },
            },
          });
        }
      } else {
        // Professional Plan: Deduct from batches using FIFO allocations
        for (const req of ingredientRequirements) {
          const allocations = batchAllocations.get(req.ingredientId) || [];
          for (const allocation of allocations) {
            await tx.inventoryBatch.update({
              where: { id: allocation.batchId },
              data: {
                currentQuantity: {
                  decrement: allocation.quantityUsed,
                },
              },
            });
          }
        }
      }

      // Add to item quantity
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });

      return {
        item: updatedItem,
        ingredientsDeducted: ingredientRequirements,
        quantityPrepared: quantity,
      };
    });

    // Invalidate caches
    await this.redis.del(`item:${tenantId}:${itemId}`);
    await this.redis.delTenantCache(tenantId, 'items');
    await this.redis.delTenantCache(tenantId, `items:category:${item.categoryId}`);

    return result;
  }
}
