import { PartialType } from '@nestjs/swagger';
import { CreateBrandingDto } from './create-branding.dto';

export class UpdateBrandingDto extends PartialType(CreateBrandingDto) {}
