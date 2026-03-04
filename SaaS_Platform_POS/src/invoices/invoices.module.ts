import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoiceSettingsController } from './invoice-settings.controller';
import { BankAccountController } from './bank-accounts/bank-account.controller';
import { TransportAgentController } from './transport-agents/transport-agent.controller';
import { BrandingController } from './branding.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceSettingsResolver } from './services/invoice-settings-resolver.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { BankAccountService } from './bank-accounts/bank-account.service';
import { TransportAgentService } from './transport-agents/transport-agent.service';
import { BrandingService } from './branding.service';
import { CommonModule } from '../common/common.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [CommonModule, InventoryModule],
  controllers: [
    // Order matters! Specific routes must come before parameterized routes
    // to avoid @Get(':id') catching /invoices/bank-accounts etc.
    BankAccountController,
    TransportAgentController,
    BrandingController,
    InvoiceSettingsController,
    InvoicesController,
  ],
  providers: [
    InvoicesService,
    InvoiceSettingsResolver,
    InvoicePdfService,
    BankAccountService,
    TransportAgentService,
    BrandingService,
  ],
  exports: [
    InvoicesService,
    InvoiceSettingsResolver,
    InvoicePdfService,
    BankAccountService,
    TransportAgentService,
    BrandingService,
  ],
})
export class InvoicesModule {}
