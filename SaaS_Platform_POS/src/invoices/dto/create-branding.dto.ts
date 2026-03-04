import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandingDto {
  @ApiProperty({ description: 'Brand name for identification', example: 'Summer Collection' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Company tagline' })
  @IsOptional()
  @IsString()
  companyTagline?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Pincode' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'GST Number' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional({ description: 'PAN Number' })
  @IsOptional()
  @IsString()
  panNumber?: string;

  @ApiPropertyOptional({ description: 'CIN Number' })
  @IsOptional()
  @IsString()
  cinNumber?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Logo position', enum: ['left', 'center', 'right'], default: 'left' })
  @IsOptional()
  @IsString()
  logoPosition?: string;

  @ApiPropertyOptional({ description: 'Logo width in pixels', default: 150 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(500)
  logoWidth?: number;

  @ApiPropertyOptional({ description: 'Primary brand color', default: '#1e40af' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Accent brand color', default: '#3b82f6' })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({ description: 'Signature URL' })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Signature text', default: 'Authorized Signatory' })
  @IsOptional()
  @IsString()
  signatureText?: string;

  @ApiPropertyOptional({ description: 'Stamp URL' })
  @IsOptional()
  @IsString()
  stampUrl?: string;

  @ApiPropertyOptional({ description: 'Set as default brand', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
