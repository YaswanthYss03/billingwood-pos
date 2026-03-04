import { IsOptional, IsString, IsIn, IsDateString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
  
  @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
  status?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
  
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;
  
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string; // Search by invoice number or customer name
}
