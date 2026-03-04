import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { 
  LocationInvoiceSettings, 
  SYSTEM_DEFAULT_INVOICE_SETTINGS,
  InvoiceTemplateConfig 
} from '../interfaces/invoice-settings.interface';

@Injectable()
export class InvoiceSettingsResolver {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve invoice settings for a specific location with proper inheritance
   * Priority: Location Settings > Tenant Defaults > System Defaults
   */
  async resolveSettingsForLocation(
    tenantId: string,
    locationId: string
  ): Promise<LocationInvoiceSettings> {
    // Fetch both tenant and location
    const [tenant, location] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { 
          settings: true, 
          name: true, 
          gstNumber: true 
        },
      }),
      this.prisma.location.findUnique({
        where: { id: locationId },
        select: { 
          settings: true, 
          name: true, 
          address: true, 
          city: true, 
          state: true, 
          pincode: true, 
          phone: true, 
          email: true 
        },
      }),
    ]);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Start with system defaults
    const resolved: LocationInvoiceSettings = JSON.parse(
      JSON.stringify(SYSTEM_DEFAULT_INVOICE_SETTINGS)
    );

    // Layer 1: Apply tenant defaults if available
    const tenantSettings = tenant.settings as any;
    if (tenantSettings?.invoiceDefaults) {
      this.deepMerge(resolved, tenantSettings.invoiceDefaults);
    }

    // Layer 2: Apply location overrides if available
    const locationSettings = location.settings as any;
    if (locationSettings?.invoiceSettings) {
      this.deepMerge(resolved, locationSettings.invoiceSettings);
    }

    // Auto-populate branding from location data if not explicitly set
    if (!locationSettings?.invoiceSettings?.branding?.businessName) {
      resolved.branding.businessName = location.name || tenant.name;
      resolved.branding.address = location.address || '';
      resolved.branding.city = location.city || '';
      resolved.branding.state = location.state || '';
      resolved.branding.pincode = location.pincode || '';
      resolved.branding.phone = location.phone || '';
      resolved.branding.email = location.email || '';
      resolved.branding.gstNumber = tenant.gstNumber || null;
    }

    return resolved;
  }

  /**
   * Deep merge utility - properly merges nested objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Get template config for a specific template at a location
   */
  async getTemplateConfig(
    tenantId: string,
    locationId: string,
    templateId: string
  ): Promise<InvoiceTemplateConfig> {
    const settings = await this.resolveSettingsForLocation(tenantId, locationId);
    
    // Check if there's a template-specific override
    if (settings.templateOverrides[templateId]) {
      return {
        ...settings.defaultTemplateConfig,
        ...settings.templateOverrides[templateId],
      };
    }
    
    return settings.defaultTemplateConfig;
  }

  /**
   * Save location-specific invoice settings
   */
  async saveLocationSettings(
    tenantId: string,
    locationId: string,
    userId: string,
    settings: Partial<LocationInvoiceSettings>
  ): Promise<void> {
    // Verify location belongs to tenant
    const location = await this.prisma.location.findUnique({
      where: { id: locationId, tenantId },
      select: { settings: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const currentSettings = (location.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      invoiceSettings: {
        ...(currentSettings.invoiceSettings || {}),
        ...settings,
        lastModified: new Date().toISOString(),
        modifiedBy: userId,
      },
    };

    await this.prisma.location.update({
      where: { id: locationId },
      data: { settings: updatedSettings },
    });
  }

  /**
   * Save tenant-level default settings
   */
  async saveTenantDefaults(
    tenantId: string,
    userId: string,
    defaults: Partial<LocationInvoiceSettings>
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const currentSettings = (tenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      invoiceDefaults: {
        ...(currentSettings.invoiceDefaults || {}),
        ...defaults,
        lastModified: new Date().toISOString(),
        modifiedBy: userId,
      },
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });
  }

  /**
   * Clone settings from one location to another
   */
  async cloneSettings(
    tenantId: string,
    fromLocationId: string,
    toLocationId: string,
    userId: string
  ): Promise<void> {
    const fromSettings = await this.resolveSettingsForLocation(tenantId, fromLocationId);
    await this.saveLocationSettings(tenantId, toLocationId, userId, fromSettings);
  }

  /**
   * Reset location to use tenant defaults (remove overrides)
   */
  async resetToTenantDefaults(
    tenantId: string,
    locationId: string
  ): Promise<void> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId, tenantId },
      select: { settings: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const currentSettings = (location.settings as any) || {};
    delete currentSettings.invoiceSettings;

    await this.prisma.location.update({
      where: { id: locationId },
      data: { settings: currentSettings },
    });
  }

  /**
   * Check if location has custom overrides
   */
  async hasLocationOverrides(
    tenantId: string,
    locationId: string
  ): Promise<boolean> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId, tenantId },
      select: { settings: true },
    });

    if (!location) {
      return false;
    }

    const settings = location.settings as any;
    return !!settings?.invoiceSettings;
  }

  /**
   * Get inheritance source for location
   */
  async getInheritanceSource(
    tenantId: string,
    locationId: string
  ): Promise<'location' | 'tenant' | 'system'> {
    const hasOverrides = await this.hasLocationOverrides(tenantId, locationId);
    
    if (hasOverrides) {
      return 'location';
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const tenantSettings = tenant?.settings as any;
    if (tenantSettings?.invoiceDefaults) {
      return 'tenant';
    }

    return 'system';
  }
}
