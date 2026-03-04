import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsDateString,
  IsIn,
  Min,
  Max,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string;
  
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemName: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemCode?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiPropertyOptional({ default: 'PCS' })
  @IsOptional()
  @IsString()
  unit?: string;
  
  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate: number;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  gstAmount: number;
  
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnCode?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sacCode?: string;
}

export class CustomerSnapshotDto {
  @ApiProperty()
  @IsString()
  name: string;
  
  @ApiProperty()
  @IsString()
  phone: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pincode?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  customerId: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportAgentId?: string;
  
  @ApiProperty()
  @IsDateString()
  invoiceDate: string;
  
  @ApiProperty()
  @IsDateString()
  dueDate: string;
  
  @ApiProperty({ enum: ['Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt'] })
  @IsString()
  @IsIn(['Net 7', 'Net 15', 'Net 30', 'Net 60', 'Due on Receipt'])
  paymentTerms: string;
  
  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @ArrayMinSize(1)
  items: CreateInvoiceItemDto[];
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  taxAmount: number;
  
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
  
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCharge?: number;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  challanNumber?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  challanDate?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ewayBillNumber?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  ewayBillDate?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lrNumber?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfSupply?: string;
  
  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;
  
  @ApiProperty({ enum: ['template-1', 'template-2', 'template-3', 'template-4', 'template-5'] })
  @IsString()
  @IsIn(['template-1', 'template-2', 'template-3', 'template-4', 'template-5'])
  templateId: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  templateConfig?: Record<string, boolean>;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsConditions?: string;
  
  @ApiProperty()
  @ValidateNested()
  @Type(() => CustomerSnapshotDto)
  customerSnapshot: CustomerSnapshotDto;
  
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  markAsSent?: boolean;
}
