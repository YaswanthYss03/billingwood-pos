import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LocationInvoiceSettings } from '../interfaces/invoice-settings.interface';

export class UpdateLocationInvoiceSettingsDto {
  @ApiProperty()
  @IsObject()
  settings: Partial<LocationInvoiceSettings>;
}

export class UpdateTenantInvoiceDefaultsDto {
  @ApiProperty()
  @IsObject()
  defaults: Partial<LocationInvoiceSettings>;
}

export class CloneSettingsDto {
  @ApiProperty()
  toLocationId: string;
}
