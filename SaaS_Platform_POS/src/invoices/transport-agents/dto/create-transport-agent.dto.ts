import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransportAgentDto {
  @ApiProperty({ description: 'Location ID', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ description: 'Transport agent name', example: 'Silver Roadlines' })
  @IsString()
  @IsNotEmpty()
  agentName: string;

  @ApiPropertyOptional({ description: 'Transporter ID (GST No)', example: '24ABSFS03218ZZL' })
  @IsString()
  @IsOptional()
  transporterId?: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Full address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Default transport mode', example: 'Road', enum: ['Road', 'Rail', 'Air', 'Ship'] })
  @IsString()
  @IsOptional()
  defaultMode?: string;
}
