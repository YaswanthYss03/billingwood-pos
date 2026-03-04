import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { CreateBrandingDto } from './dto/create-branding.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/user.decorator';
import { FileUploadService } from '../common/services/file-upload.service';

@ApiTags('Brandings')
@ApiBearerAuth()
@Controller('invoices/brandings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandingController {
  constructor(
    private readonly brandingService: BrandingService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('locations/:locationId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new branding' })
  @ApiResponse({ status: 201, description: 'Branding created successfully' })
  async create(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Body() dto: CreateBrandingDto,
  ) {
    return this.brandingService.create(user.tenantId, locationId, dto);
  }

  @Get('locations/:locationId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get all brandings for a location' })
  @ApiResponse({ status: 200, description: 'Brandings retrieved successfully' })
  async findAll(@Param('locationId') locationId: string) {
    return this.brandingService.findAll(locationId);
  }

  @Get('locations/:locationId/default')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get default branding for a location' })
  @ApiResponse({ status: 200, description: 'Default branding retrieved successfully' })
  async findDefault(@Param('locationId') locationId: string) {
    return this.brandingService.findDefault(locationId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get a branding by ID' })
  @ApiResponse({ status: 200, description: 'Branding retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.brandingService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a branding' })
  @ApiResponse({ status: 200, description: 'Branding updated successfully' })
  async update(@Param('id') id: string, @Body() dto: UpdateBrandingDto) {
    return this.brandingService.update(id, dto);
  }

  @Post(':id/set-default')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Set branding as default' })
  @ApiResponse({ status: 200, description: 'Branding set as default successfully' })
  async setDefault(@Param('id') id: string) {
    return this.brandingService.setDefault(id);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a branding' })
  @ApiResponse({ status: 200, description: 'Branding deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.brandingService.remove(id);
  }

  // File upload endpoints
  @Post(':id/upload-logo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload logo for branding' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const branding = await this.brandingService.findOne(id);

    // Upload to Supabase
    const logoUrl = await this.fileUploadService.uploadToSupabase(
      file,
      'logos',
      user.tenantId,
      branding.locationId,
    );

    // Update branding
    await this.brandingService.update(id, { logoUrl });

    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: { logoUrl },
    };
  }

  @Delete(':id/logo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete logo from branding' })
  @ApiResponse({ status: 200, description: 'Logo deleted successfully' })
  async deleteLogo(@Param('id') id: string) {
    const branding = await this.brandingService.findOne(id);

    if (branding.logoUrl) {
      await this.fileUploadService.deleteFromSupabase(branding.logoUrl);
      await this.brandingService.update(id, { logoUrl: undefined });
    }

    return {
      success: true,
      message: 'Logo deleted successfully',
    };
  }

  @Post(':id/upload-signature')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload signature for branding' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Signature uploaded successfully' })
  async uploadSignature(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const branding = await this.brandingService.findOne(id);

    // Upload to Supabase
    const signatureUrl = await this.fileUploadService.uploadToSupabase(
      file,
      'signatures',
      user.tenantId,
      branding.locationId,
    );

    // Update branding
    await this.brandingService.update(id, { signatureUrl });

    return {
      success: true,
      message: 'Signature uploaded successfully',
      data: { signatureUrl },
    };
  }

  @Delete(':id/signature')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete signature from branding' })
  @ApiResponse({ status: 200, description: 'Signature deleted successfully' })
  async deleteSignature(@Param('id') id: string) {
    const branding = await this.brandingService.findOne(id);

    if (branding.signatureUrl) {
      await this.fileUploadService.deleteFromSupabase(branding.signatureUrl);
      await this.brandingService.update(id, { signatureUrl: undefined });
    }

    return {
      success: true,
      message: 'Signature deleted successfully',
    };
  }

  @Post(':id/upload-stamp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload stamp for branding' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Stamp uploaded successfully' })
  async uploadStamp(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const branding = await this.brandingService.findOne(id);

    // Upload to Supabase
    const stampUrl = await this.fileUploadService.uploadToSupabase(
      file,
      'stamps',
      user.tenantId,
      branding.locationId,
    );

    // Update branding
    await this.brandingService.update(id, { stampUrl });

    return {
      success: true,
      message: 'Stamp uploaded successfully',
      data: { stampUrl },
    };
  }

  @Delete(':id/stamp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete stamp from branding' })
  @ApiResponse({ status: 200, description: 'Stamp deleted successfully' })
  async deleteStamp(@Param('id') id: string) {
    const branding = await this.brandingService.findOne(id);

    if (branding.stampUrl) {
      await this.fileUploadService.deleteFromSupabase(branding.stampUrl);
      await this.brandingService.update(id, { stampUrl: undefined });
    }

    return {
      success: true,
      message: 'Stamp deleted successfully',
    };
  }
}
