import { IsString, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType, InventoryMode } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Cappuccino' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Classic Italian coffee with steamed milk' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'CAP001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'SIMPLE', enum: ItemType })
  @IsEnum(ItemType)
  @IsOptional()
  itemType?: ItemType;

  @ApiProperty({ example: 150.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 5.0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: 'AUTO', enum: InventoryMode, description: 'AUTO: Auto-deduct inventory on billing, MANUAL: Manual inventory management (infinity quantity)' })
  @IsOptional()
  @IsEnum(InventoryMode)
  inventoryMode?: InventoryMode;

  @ApiPropertyOptional({ example: 'PCS' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '6109' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional({ example: '998599' })
  @IsOptional()
  @IsString()
  sacCode?: string;
}
