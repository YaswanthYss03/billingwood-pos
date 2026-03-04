import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordPaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;
  
  @ApiProperty({ enum: ['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'OTHER'] })
  @IsString()
  @IsIn(['CASH', 'CARD', 'UPI', 'CHEQUE', 'BANK_TRANSFER', 'OTHER'])
  paymentMethod: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
