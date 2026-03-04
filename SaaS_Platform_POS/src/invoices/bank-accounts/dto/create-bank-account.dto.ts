import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Location ID', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Account name/label', example: 'ICICI Primary Account' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ description: 'Bank name', example: 'ICICI Bank' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ description: 'Account number', example: '2715500356' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ description: 'Account holder name', example: 'Gujarat Freight Tools' })
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @ApiProperty({ description: 'IFSC code', example: 'ICIC045F' })
  @IsString()
  @IsNotEmpty()
  ifscCode: string;

  @ApiPropertyOptional({ description: 'Branch name', example: 'Surat' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ description: 'Account type', example: 'CURRENT', enum: ['SAVINGS', 'CURRENT'] })
  @IsString()
  @IsOptional()
  accountType?: string;

  @ApiPropertyOptional({ description: 'UPI ID', example: 'ifox@icici' })
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiPropertyOptional({ description: 'Set as default account', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
