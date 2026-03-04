import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoiceSettingsResolver } from './services/invoice-settings-resolver.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';
import { FileUploadService } from '../common/services/file-upload.service';
import {
  UpdateLocationInvoiceSettingsDto,
  UpdateTenantInvoiceDefaultsDto,
} from './dto';

@ApiTags('Invoice Settings')
@Controller('invoices/settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceSettingsController {
  constructor(
    private readonly settingsResolver: InvoiceSettingsResolver,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get('locations/:locationId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get resolved invoice settings for location (with inheritance)',
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getLocationSettings(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    const hasOverrides = await this.settingsResolver.hasLocationOverrides(
      user.tenantId,
      locationId,
    );

    const inheritanceSource = await this.settingsResolver.getInheritanceSource(
      user.tenantId,
      locationId,
    );

    return {
      success: true,
      data: {
        settings,
        metadata: {
          hasLocationOverrides: hasOverrides,
          inheritanceSource,
        },
      },
    };
  }

  @Patch('locations/:locationId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update location-specific invoice settings' })
  async updateLocationSettings(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Body() updateDto: UpdateLocationInvoiceSettingsDto,
  ) {
    await this.settingsResolver.saveLocationSettings(
      user.tenantId,
      locationId,
      user.id,
      updateDto.settings,
    );

    return {
      success: true,
      message: 'Location settings updated successfully',
    };
  }

  @Delete('locations/:locationId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Reset location settings to tenant defaults (remove overrides)',
  })
  async resetLocationSettings(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    await this.settingsResolver.resetToTenantDefaults(
      user.tenantId,
      locationId,
    );

    return {
      success: true,
      message: 'Location settings reset to tenant defaults',
    };
  }

  @Post('locations/:locationId/clone')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Clone settings from another location' })
  async cloneSettings(
    @CurrentUser() user: any,
    @Param('locationId') targetLocationId: string,
    @Body('sourceLocationId') sourceLocationId: string,
  ) {
    await this.settingsResolver.cloneSettings(
      user.tenantId,
      sourceLocationId,
      targetLocationId,
      user.id,
    );

    return {
      success: true,
      message: 'Settings cloned successfully',
    };
  }

  @Get('tenant/defaults')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant-wide default invoice settings' })
  async getTenantDefaults(@CurrentUser() user: any) {
    // Get any location from this tenant to resolve settings
    const firstLocation = await this.settingsResolver['prisma'].location.findFirst({
      where: { tenantId: user.tenantId },
      select: { id: true },
    });

    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      firstLocation?.id || '', // Use first location or empty string
    );

    return {
      success: true,
      data: settings,
    };
  }

  @Patch('tenant/defaults')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update tenant-wide default invoice settings' })
  async updateTenantDefaults(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateTenantInvoiceDefaultsDto,
  ) {
    await this.settingsResolver.saveTenantDefaults(
      user.tenantId,
      user.id,
      updateDto.defaults,
    );

    return {
      success: true,
      message: 'Tenant defaults updated successfully',
    };
  }

  @Get('locations/:locationId/templates/:templateId/preview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Preview invoice template with mock data' })
  async previewTemplate(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @Param('templateId') templateId: string,
  ) {
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    const templateConfig = await this.settingsResolver.getTemplateConfig(
      user.tenantId,
      locationId,
      templateId,
    );

    // Mock invoice data for preview
    const mockInvoice = {
      invoiceNumber: 'INV202501-000001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      customer: {
        name: 'Sample Customer Pvt Ltd',
        email: 'customer@example.com',
        phone: '+91 98765 43210',
        billingAddress: '123 Business Street, Mumbai, MH 400001',
        gstNumber: '27AABCU9603R1ZM',
      },
      items: [
        {
          name: 'Product A',
          hsnCode: '8471',
          quantity: 10,
          unit: 'PCS',
          basePrice: 100.0,
          gstRate: 18.0,
          discountAmount: 10.0,
          totalAmount: 1062.0,
        },
        {
          name: 'Service B',
          hsnCode: '9983',
          quantity: 2,
          unit: 'HRS',
          basePrice: 500.0,
          gstRate: 18.0,
          discountAmount: 0.0,
          totalAmount: 1180.0,
        },
      ],
      subtotal: 1590.0,
      totalDiscount: 10.0,
      totalGST: 282.0,
      roundOff: 0.0,
      totalAmount: 2242.0,
      amountInWords: 'Two Thousand Two Hundred Forty Two Rupees Only',
      branding: settings.branding,
      bankDetails: settings.bankDetails,
      textDefaults: settings.textDefaults,
    };

    return {
      success: true,
      data: {
        templateId,
        templateConfig,
        mockInvoice,
      },
    };
  }

  @Post('locations/:locationId/upload-logo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload logo for location invoice settings' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Upload to Supabase
    const logoUrl = await this.fileUploadService.uploadToSupabase(file, 'logos', user.tenantId, locationId);

    // Get current settings
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    // Update logo URL
    settings.branding.logoUrl = logoUrl;

    // Save only the branding object
    await this.settingsResolver.saveLocationSettings(
      user.tenantId,
      locationId,
      user.id,
      { branding: settings.branding },
    );

    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: { logoUrl },
    };
  }

  @Post('locations/:locationId/upload-signature')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload signature for location invoice settings' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Signature uploaded successfully' })
  async uploadSignature(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const signatureUrl = await this.fileUploadService.uploadToSupabase(file, 'signatures', user.tenantId, locationId);

    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    settings.branding.signatureUrl = signatureUrl;

    // Save only the branding object
    await this.settingsResolver.saveLocationSettings(
      user.tenantId,
      locationId,
      user.id,
      { branding: settings.branding },
    );

    return {
      success: true,
      message: 'Signature uploaded successfully',
      data: { signatureUrl },
    };
  }

  @Post('locations/:locationId/upload-stamp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload stamp for location invoice settings' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Stamp uploaded successfully' })
  async uploadStamp(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const stampUrl = await this.fileUploadService.uploadToSupabase(file, 'stamps', user.tenantId, locationId);

    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    settings.branding.stampUrl = stampUrl;

    // Save only the branding object
    await this.settingsResolver.saveLocationSettings(
      user.tenantId,
      locationId,
      user.id,
      { branding: settings.branding },
    );

    return {
      success: true,
      message: 'Stamp uploaded successfully',
      data: { stampUrl },
    };
  }

  @Delete('locations/:locationId/logo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete logo from location invoice settings' })
  @ApiResponse({ status: 200, description: 'Logo deleted successfully' })
  async deleteLogo(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    if (settings.branding.logoUrl) {
      await this.fileUploadService.deleteFromSupabase(settings.branding.logoUrl);
      settings.branding.logoUrl = null;

      // Save only the branding object
      await this.settingsResolver.saveLocationSettings(
        user.tenantId,
        locationId,
        user.id,
        { branding: settings.branding },
      );
    }

    return {
      success: true,
      message: 'Logo deleted successfully',
    };
  }

  @Delete('locations/:locationId/signature')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete signature from location invoice settings' })
  @ApiResponse({ status: 200, description: 'Signature deleted successfully' })
  async deleteSignature(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    if (settings.branding.signatureUrl) {
      await this.fileUploadService.deleteFromSupabase(settings.branding.signatureUrl);
      settings.branding.signatureUrl = null;

      // Save only the branding object
      await this.settingsResolver.saveLocationSettings(
        user.tenantId,
        locationId,
        user.id,
        { branding: settings.branding },
      );
    }

    return {
      success: true,
      message: 'Signature deleted successfully',
    };
  }

  @Delete('locations/:locationId/stamp')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete stamp from location invoice settings' })
  @ApiResponse({ status: 200, description: 'Stamp deleted successfully' })
  async deleteStamp(
    @CurrentUser() user: any,
    @Param('locationId') locationId: string,
  ) {
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      user.tenantId,
      locationId,
    );

    if (settings.branding.stampUrl) {
      await this.fileUploadService.deleteFromSupabase(settings.branding.stampUrl);
      settings.branding.stampUrl = null;

      // Save only the branding object
      await this.settingsResolver.saveLocationSettings(
        user.tenantId,
        locationId,
        user.id,
        { branding: settings.branding },
      );
    }

    return {
      success: true,
      message: 'Stamp deleted successfully',
    };
  }
}
