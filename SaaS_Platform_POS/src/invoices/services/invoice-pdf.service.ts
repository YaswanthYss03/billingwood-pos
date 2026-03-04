import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { InvoiceSettingsResolver } from './invoice-settings-resolver.service';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

interface InvoiceData {
  invoice: any;
  items: any[];
  payments: any[];
  location: any;
  tenant: any;
  settings: any;
}

@Injectable()
export class InvoicePdfService {
  constructor(
    private prisma: PrismaService,
    private settingsResolver: InvoiceSettingsResolver,
  ) {}

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(
    tenantId: string,
    invoiceId: string,
  ): Promise<Buffer> {
    // Fetch invoice with all relations including bank account and transport agent
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        payments: true,
        location: true,
        tenant: true,
        bankAccount: true,
        transportAgent: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Get default location if invoice doesn't have one
    let locationId = invoice.locationId;
    if (!locationId) {
      const defaultLocation = await this.prisma.location.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { isHeadquarters: 'desc' },
      });
      
      if (!defaultLocation) {
        throw new BadRequestException('No active location found for this tenant');
      }
      
      locationId = defaultLocation.id;
    }

    // Resolve settings for the location
    const settings = await this.settingsResolver.resolveSettingsForLocation(
      tenantId,
      locationId,
    );

    // Check for default branding in Branding table (takes precedence)
    const defaultBranding = await this.prisma.branding.findFirst({
      where: {
        locationId,
        isDefault: true,
        deletedAt: null,
      },
    });

    // Use branding from Branding table if available, otherwise fall back to settings
    if (defaultBranding) {
      settings.branding = {
        logoUrl: defaultBranding.logoUrl || null,
        logoPosition: (defaultBranding.logoPosition as 'left' | 'center' | 'right') || 'left',
        logoWidth: defaultBranding.logoWidth || 150,
        primaryColor: defaultBranding.primaryColor || '#1e40af',
        accentColor: defaultBranding.accentColor || '#3b82f6',
        businessName: defaultBranding.businessName || '',
        tagline: defaultBranding.companyTagline || null,
        address: defaultBranding.address || '',
        city: defaultBranding.city || '',
        state: defaultBranding.state || '',
        pincode: defaultBranding.pincode || '',
        phone: defaultBranding.phone || '',
        email: defaultBranding.email || '',
        website: defaultBranding.website || null,
        gstNumber: defaultBranding.gstNumber || null,
        panNumber: defaultBranding.panNumber || null,
        cinNumber: defaultBranding.cinNumber || null,
        signatureUrl: defaultBranding.signatureUrl || null,
        signatureText: defaultBranding.signatureText || 'Authorized Signatory',
        stampUrl: defaultBranding.stampUrl || null,
      };
    }

    console.log('=== PDF GENERATION DEBUG ===');
    console.log('Settings branding:', JSON.stringify(settings.branding, null, 2));
    console.log('Logo URL:', settings.branding.logoUrl);
    console.log('Signature URL:', settings.branding.signatureUrl);
    console.log('Stamp URL:', settings.branding.stampUrl);
    console.log('===========================');

    const data: InvoiceData = {
      invoice,
      items: invoice.items,
      payments: invoice.payments,
      location: invoice.location,
      tenant: invoice.tenant,
      settings,
    };

    // Get template config
    const templateConfig = await this.settingsResolver.getTemplateConfig(
      tenantId,
      locationId,
      invoice.templateId,
    );

    // Generate HTML based on template
    const templateId = invoice.templateId || 'template-1';
    console.log('Generating PDF with template:', templateId);
    const html = this.generateInvoiceHTML(data, templateConfig);

    // Generate PDF using Puppeteer
    console.log('Launching browser for PDF generation...');
    
    // Use chromium for serverless/cloud environments (Render, Vercel, Lambda, etc.)
    const isProduction = process.env.NODE_ENV === 'production';
    
    let launchOptions;
    if (isProduction) {
      // Production: Use @sparticuz/chromium for serverless
      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      // Development: Use local chromium
      launchOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        headless: true,
      };
    }
    
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      console.log('PDF generated successfully, size:', pdfBuffer.length);
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Helper: Convert number to words (for total amount)
   */
  private convertToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const numStr = Math.floor(num).toString();
    let words = '';

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const tensAndOnes = num % 100;

    if (crores > 0) words += this.convertToWords(crores) + ' Crore ';
    if (lakhs > 0) words += this.convertToWords(lakhs) + ' Lakh ';
    if (thousands > 0) words += this.convertToWords(thousands) + ' Thousand ';
    if (hundreds > 0) words += ones[hundreds] + ' Hundred ';
    if (tensAndOnes >= 10 && tensAndOnes < 20) {
      words += teens[tensAndOnes - 10];
    } else if (tensAndOnes >= 20) {
      words += tens[Math.floor(tensAndOnes / 10)] + ' ' + ones[tensAndOnes % 10];
    } else if (tensAndOnes > 0) {
      words += ones[tensAndOnes];
    }

    return words.trim();
  }

  /**
   * Helper: Get state GST code
   */
  private getStateCode(stateName: string): string {
    const stateCodes: Record<string, string> = {
      'Andhra Pradesh': '37', 'Arunachal Pradesh': '12', 'Assam': '18', 'Bihar': '10',
      'Chhattisgarh': '22', 'Goa': '30', 'Gujarat': '24', 'Haryana': '06',
      'Himachal Pradesh': '02', 'Jharkhand': '20', 'Karnataka': '29', 'Kerala': '32',
      'Madhya Pradesh': '23', 'Maharashtra': '27', 'Manipur': '14', 'Meghalaya': '17',
      'Mizoram': '15', 'Nagaland': '13', 'Odisha': '21', 'Punjab': '03',
      'Rajasthan': '08', 'Sikkim': '11', 'Tamil Nadu': '33', 'Telangana': '36',
      'Tripura': '16', 'Uttar Pradesh': '09', 'Uttarakhand': '05', 'West Bengal': '19',
      'Delhi': '07', 'Puducherry': '34', 'Jammu and Kashmir': '01', 'Ladakh': '38',
    };
    return stateCodes[stateName] || '';
  }

  /**
   * Generate HTML invoice template matching the exact layout
   */
  private generateInvoiceHTML(data: InvoiceData, config: any): string {
    const { invoice, items, settings } = data;
    const { branding, bankDetails, textDefaults } = settings;
    const currency = invoice.currency || '₹';

    // Default config values if not provided
    const showLogo = config?.showLogo !== false;
    const showCompanyAddress = config?.showCompanyAddress !== false;
    const showCustomerAddress = config?.showCustomerAddress !== false;
    const showGST = config?.showGST !== false;
    const showHSN = config?.showHSN !== false;
    const showPAN = config?.showPAN !== false;
    const showItemCode = config?.showItemCode !== false;
    const showUnit = config?.showUnit !== false;
    const showDiscount = config?.showDiscount !== false;
    const showBankDetails = config?.showBankDetails !== false;
    const showSignature = config?.showSignature !== false;
    const showStamp = config?.showStamp !== false;
    const showQRCode = config?.showQRCode !== false;
    const showTermsConditions = config?.showTermsConditions !== false;
    const showShippingCharge = config?.showShippingCharge !== false;

    // Determine invoice status for badge
    let statusBadge = '';
    let statusClass = '';
    if (invoice.status === 'DRAFT') {
      statusBadge = 'DRAFT';
      statusClass = 'status-draft';
    } else if (invoice.status === 'PAID') {
      statusBadge = 'PAYMENT RECEIVED';
      statusClass = 'status-paid';
    } else if (invoice.status === 'PARTIALLY_PAID') {
      statusBadge = 'PARTIAL PAYMENT RECEIVED';
      statusClass = 'status-partial';
    }

    // Calculate totals with null safety
    const subtotal = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return sum + (quantity * price);
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const taxRate = Number(item.taxRate) || Number(item.gstRate) || 0;
      const itemTotal = quantity * price;
      return sum + (itemTotal * (taxRate / 100));
    }, 0);
    const discount = Number(invoice.discount) || 0;
    const shippingCharge = Number(invoice.shippingCharge) || 0;
    const total = subtotal + taxAmount - (showDiscount ? discount : 0) + (showShippingCharge ? shippingCharge : 0);
    
    const totalInWords = this.convertToWords(total) + ' Rupees Only';
    const placeOfSupply = invoice.placeOfSupply || invoice.customerState || branding.state || '';
    const stateCode = this.getStateCode(placeOfSupply);
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    // Replace color placeholders
    const primaryColor = branding.primaryColor || '#1e40af';
    const accentColor = branding.accentColor || '#3b82f6';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 10px; color: #000; padding: 15px; }
    .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #000; page-break-inside: avoid; position: relative; }
    
    /* Status Watermark */
    .status-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; font-weight: bold; opacity: 0.08; z-index: 1; pointer-events: none; text-transform: uppercase; }
    .status-watermark.draft { color: #92400e; }
    .status-watermark.paid { color: #065f46; }
    .status-watermark.partial { color: #1e40af; }
    .content-wrapper { position: relative; z-index: 2; }
    
    /* Header Section */
    .header { display: flex; justify-content: space-between; padding: 15px; border-bottom: 3px solid {{primaryColor}}; position: relative; }
    .company-left { flex: 1; }
    .company-name { font-size: 24px; font-weight: bold; color: {{primaryColor}}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-tagline { font-size: 11px; font-weight: 600; margin-bottom: 10px; color: {{accentColor}}; font-style: italic; }
    .company-details { font-size: 10px; line-height: 1.7; color: #333; }
    .logo-right { text-align: right; }
    .logo-right img { max-width: 180px; max-height: 140px; object-fit: contain; }
    
    /* Invoice Meta Section */
    .invoice-meta { display: flex; padding: 10px 15px; border-bottom: 1px solid #000; background: #f9fafb; }
    .meta-left { flex: 1; padding-right: 20px; border-right: 1px solid #000; }
    .meta-right { flex: 1; padding-left: 20px; }
    .invoice-title { font-size: 14px; font-weight: bold; margin-bottom: 4px; color: {{primaryColor}}; }
    .invoice-subtitle { font-size: 9px; margin-bottom: 8px; color: #666; }
    .meta-table { width: 100%; font-size: 9px; }
    .meta-table td { padding: 3px 5px; }
    .meta-table td:first-child { font-weight: bold; width: 40%; }
    
    /* Customer Section */
    .customer-section { padding: 10px 15px; border-bottom: 1px solid #000; font-size: 10px; line-height: 1.6; }
    .customer-section strong { font-weight: bold; }
    
    /* Items Table */
    .items-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .items-table thead { background: {{primaryColor}}; color: white; }
    .items-table th { padding: 6px 4px; text-align: left; font-weight: bold; border: 1px solid #000; }
    .items-table td { padding: 8px 6px; border: 1px solid #000; vertical-align: middle; }
    .items-table .text-center { text-align: center; }
    .items-table .text-right { text-align: right; }
    .items-table tfoot { font-weight: bold; background: #f5f5f5; }
    
    /* Footer Section */
    .footer-section { display: flex; padding: 15px; page-break-inside: avoid; }
    .footer-left { flex: 1; padding-right: 15px; }
    .footer-right { flex: 1; padding-left: 15px; border-left: 1px solid #000; page-break-inside: avoid; }
    
    /* Payment History */
    .payment-history { margin-bottom: 15px; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px; background: #f9fafb; }
    .payment-history h3 { font-size: 11px; font-weight: bold; margin-bottom: 8px; color: {{primaryColor}}; }
    .payment-history table { width: 100%; font-size: 9px; }
    .payment-history th { padding: 4px; text-align: left; border-bottom: 1px solid #d1d5db; font-weight: bold; }
    .payment-history td { padding: 4px; border-bottom: 1px solid #e5e7eb; }
    .total-words { font-size: 10px; font-weight: bold; margin-bottom: 15px; padding: 8px; background: #f5f5f5; }
    .bank-details { margin-bottom: 15px; }
    .bank-details h3 { font-size: 11px; font-weight: bold; margin-bottom: 6px; }
    .bank-details table { width: 100%; font-size: 9px; }
    .bank-details td { padding: 3px 5px; }
    .bank-details td:first-child { font-weight: bold; width: 35%; }
    .terms { font-size: 9px; margin-top: 10px; }
    .terms h4 { font-weight: bold; margin-bottom: 4px; }
    .qr-section { text-align: center; margin-bottom: 15px; }
    .qr-section img { max-width: 120px; max-height: 120px; }
    .qr-section p { font-size: 9px; margin-top: 4px; font-weight: bold; }
    .totals-table { width: 100%; font-size: 10px; margin-bottom: 10px; border-collapse: collapse; }
    .totals-table thead th { text align: left; padding: 4px 8px; font-weight: bold; border-bottom: 2px solid #000; }
    .totals-table thead th:last-child { text-align: right; }
    .totals-table td { padding: 4px 8px; }
    .totals-table td:first-child { text-align: left; }
    .totals-table td:last-child { text-align: right; font-weight: bold; }
    .grand-total { font-size: 12px; background: #f5f5f5; border-top: 2px solid #000; }
    .eoe { text-align: right; font-size: 8px; font-style: italic; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 10px; padding: 10px 15px; border-top: 1px solid #e5e7eb; page-break-inside: avoid; }
    .customer-signature { flex: 1; padding-right: 15px; }
    .authorized-signature { flex: 1; padding-left: 15px; border-left: 1px solid #e5e7eb; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .signature-box { border: 1px solid #d1d5db; padding: 10px; border-radius: 4px; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; }
    .signature-label { font-size: 10px; font-weight: bold; margin-bottom: 5px; color: #374151; }
    .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; font-size: 9px; text-align: center; }
    .authorized-signature p { font-size: 10px; margin: 2px 0; text-align: center; }
    .authorized-signature em { font-size: 8px; color: #666; }
    .authorized-signature img { max-width: 100px !important; max-height: 50px !important; margin: 5px auto; display: block; }
    
    /* Print optimization */
    @media print {
      .footer-section { page-break-inside: avoid !important; }
      .signature { page-break-inside: avoid !important; }
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    ${statusBadge ? `<div class="status-watermark ${statusClass.replace('status-', '')}">${statusBadge}</div>` : ''}
    <div class="content-wrapper">
    
    <!-- HEADER: Company Name + Logo -->
    <div class="header">
      <div class="company-left">
        <div class="company-name">${branding.businessName || branding.companyName || 'Your Company'}</div>
        <div class="company-tagline">${branding.companyTagline || branding.tagline || ''}</div>
        ${showCompanyAddress ? `
        <div class="company-details">
          ${branding.address || ''}<br/>
          ${branding.city || ''}, ${branding.state || ''} - ${branding.pincode || ''}<br/>
          ${showPAN ? `PAN: <strong>${branding.panNumber || ''}</strong> | ` : ''}
          Phone: <strong>${branding.phone || ''}</strong><br/>
          ${branding.website ? `Web: <strong>${branding.website}</strong><br/>` : ''}
          ${showGST ? `GSTIN: <strong>${branding.gstNumber || ''}</strong>` : ''}
        </div>
        ` : ''}
      </div>
      ${showLogo ? `
      <div class="logo-right">
        ${branding.logoUrl ? `
          <img src="${branding.logoUrl}" alt="Logo" />
        ` : ''}
      </div>
      ` : ''}
    </div>
    
    <!-- INVOICE & TRANSPORT DETAILS -->
    <div class="invoice-meta">
      <div class="meta-left">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-subtitle">ORIGINAL FOR RECIPIENT</div>
        <table class="meta-table">
          <tr><td>Invoice No</td><td>${invoice.invoiceNumber}</td></tr>
          <tr><td>Invoice Date</td><td>${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td></tr>
          ${invoice.challanNumber ? `<tr><td>Challan No</td><td>${invoice.challanNumber}</td></tr>` : ''}
          ${invoice.challanDate ? `<tr><td>Challan Date</td><td>${new Date(invoice.challanDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
        </table>
      </div>
      <div class="meta-right">
        <table class="meta-table">
          ${showGST ? `<tr><td>GST</td><td>${branding.gstNumber || ''}</td></tr>` : ''}
          ${invoice.ewayBillNumber ? `<tr><td>E-Way Bill No</td><td>${invoice.ewayBillNumber}</td></tr>` : ''}
          ${invoice.ewayBillDate ? `<tr><td>E-Way Bill Date</td><td>${new Date(invoice.ewayBillDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
          ${invoice.transportAgent ? `<tr><td>Transport</td><td>${invoice.transportAgent.agentName}</td></tr>` : ''}
          ${invoice.transportAgent?.transporterId ? `<tr><td>Transport ID</td><td>${invoice.transportAgent.transporterId}</td></tr>` : ''}
          ${invoice.vehicleNumber ? `<tr><td>Vehicle No</td><td>${invoice.vehicleNumber}</td></tr>` : ''}
          ${invoice.lrNumber ? `<tr><td>LR Number</td><td>${invoice.lrNumber}</td></tr>` : ''}
        </table>
      </div>
    </div>
    
    <!-- CUSTOMER DETAILS -->
    ${showCustomerAddress ? `
    <div class="customer-section">
      <strong>M/S :</strong> ${invoice.customerName}<br/>
      <strong>Address :</strong> ${invoice.customerAddress || ''}, ${invoice.customerCity || ''}, ${invoice.customerState || ''} - ${invoice.customerPincode || ''}<br/>
      <strong>Phone :</strong> ${invoice.customerPhone || ''}<br/>
      ${showGST ? `<strong>GSTIN :</strong> ${invoice.customerGSTIN || ''}<br/>` : ''}
      <strong>Place of Supply :</strong> ${placeOfSupply} ${stateCode ? '(' + stateCode + ')' : ''}
    </div>
    ` : ''}
    
    <!-- ITEMS TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 5%;" rowspan="2">Sr.<br/>No.</th>
          <th style="${showHSN ? 'width: 30%;' : 'width: 40%;'}" rowspan="2">Name of Product / Service</th>
          ${showHSN ? '<th class="text-center" style="width: 10%;" rowspan="2">HSN / SAC</th>' : ''}
          <th class="text-center" style="width: 8%;" rowspan="2">Qty</th>
          ${showUnit ? '<th class="text-center" style="width: 8%;" rowspan="2">Unit</th>' : ''}
          <th class="text-center" style="width: 10%;" rowspan="2">Rate</th>
          <th class="text-center" style="width: 12%;" rowspan="2">Taxable Value</th>
          <th class="text-center" colspan="2" style="width: 12%;">IGST</th>
          <th class="text-center" style="width: 12%;" rowspan="2">Total</th>
        </tr>
        <tr>
          <th class="text-center" style="width: 5%;">%</th>
          <th class="text-center" style="width: 7%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, index) => {
          const quantity = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const taxRate = Number(item.taxRate) || Number(item.gstRate) || 0;
          const itemTotal = quantity * price;
          const itemTax = itemTotal * (taxRate / 100);
          const itemTotalWithTax = itemTotal + itemTax;
          return `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td><strong>${item.itemName || item.name || 'Item'}</strong></td>
              ${showHSN ? `<td class="text-center">${item.hsnCode || item.sacCode || '-'}</td>` : ''}
              <td class="text-center">${quantity}</td>
              ${showUnit ? `<td class="text-center">${item.unit || 'NOS'}</td>` : ''}
              <td class="text-right">${price.toFixed(2)}</td>
              <td class="text-right">${itemTotal.toFixed(2)}</td>
              <td class="text-center">${taxRate.toFixed(2)}</td>
              <td class="text-right">${itemTax.toFixed(2)}</td>
              <td class="text-right"><strong>${currency} ${itemTotalWithTax.toFixed(2)}</strong></td>
            </tr>
          `;
        }).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="${showHSN && showUnit ? '4' : showHSN || showUnit ? '3' : '2'}" class="text-center"><strong>Total</strong></td>
          <td class="text-center"><strong>${totalQuantity} ${showUnit ? 'NOS' : ''}</strong></td>
          <td></td>
          <td class="text-right"><strong>${subtotal.toFixed(2)}</strong></td>
          <td></td>
          <td class="text-right"><strong>${taxAmount.toFixed(2)}</strong></td>
          <td class="text-right"><strong>${currency} ${total.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
    
    <!-- FOOTER: Bank Details + QR + Totals -->
    <div class="footer-section">
      <div class="footer-left">
        <!-- Total in Words -->
        <div class="total-words">
          <strong>Total in words :</strong><br/>
          ${totalInWords}
        </div>
        
        <!-- Bank Details -->
        ${showBankDetails && invoice.bankAccount ? `
        <div class="bank-details">
          <h3>Bank Details</h3>
          <table>
            <tr><td>Name</td><td>${invoice.bankAccount.bankName}</td></tr>
            <tr><td>Branch</td><td>${invoice.bankAccount.branchName || 'N/A'}</td></tr>
            <tr><td>Acc. Number</td><td>${invoice.bankAccount.accountNumber}</td></tr>
            <tr><td>IFSC</td><td>${invoice.bankAccount.ifscCode}</td></tr>
            ${invoice.bankAccount.upiId ? `<tr><td>UPI ID</td><td>${invoice.bankAccount.upiId}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}
        
        <!-- Payment History (for partial payments) -->
        ${invoice.status === 'PARTIALLY_PAID' && data.payments && data.payments.length > 0 ? `
        <div class="payment-history">
          <h3>Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.payments.map(payment => `
                <tr>
                  <td>${new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                  <td>${payment.paymentMethod || 'N/A'}</td>
                  <td>${payment.referenceNumber || '-'}</td>
                  <td style="text-align: right;">${currency} ${Number(payment.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <!-- Terms and Conditions -->
        ${showTermsConditions ? `
        <div class="terms">
          <h4>Terms and Conditions</h4>
          <p>${invoice.termsConditions || textDefaults.termsConditions || 'Subject to Maharashtra Jurisdiction.'}</p>
          <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
          <p>Goods once sold will not taken back.</p>
          <p>Delivery Ex-Premises.</p>
        </div>
        ` : ''}
      </div>
      
      <div class="footer-right">
        <!-- QR Code for Payment -->
        ${showQRCode && invoice.bankAccount?.qrCodeUrl ? `
        <div class="qr-section">
          <img src="${invoice.bankAccount.qrCodeUrl}" alt="Payment QR Code" />
          <p>Pay using UPI</p>
          <p style="font-size: 8px; margin-top: 8px;">(E & O.E.)</p>
        </div>
        ` : ''}
        
        <!-- Totals Table -->
        <table class="totals-table">
          <thead>
            <tr><th>Description</th><th>Amount (${currency})</th></tr>
          </thead>
          <tbody>
            <tr><td>Taxable Amount</td><td>${subtotal.toFixed(2)}</td></tr>
            <tr><td>Add - IGST</td><td>${taxAmount.toFixed(2)}</td></tr>
            <tr><td>Total Tax</td><td>${taxAmount.toFixed(2)}</td></tr>
            ${showDiscount && discount > 0 ? `<tr><td>Discount</td><td>- ${discount.toFixed(2)}</td></tr>` : ''}
            ${showShippingCharge && shippingCharge > 0 ? `<tr><td>Shipping Charge</td><td>${shippingCharge.toFixed(2)}</td></tr>` : ''}
            <tr class="grand-total"><td><strong>Total Amount After Tax</strong></td><td><strong>${total.toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
        <div class="eoe">(E & O.E.)</div>
      </div>
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
      <!-- Customer Signature -->
      <div class="customer-signature">
        <div class="signature-box">
          <div class="signature-label">Customer Signature</div>
          <div class="signature-line"></div>
        </div>
      </div>
      
      <!-- Authorized Signatory -->
      ${showSignature || showStamp ? `
      <div class="authorized-signature">
        <p><strong>Certified that the particulars given above are true and correct</strong></p>
        <p style="margin-top: 8px;"><strong>For ${branding.businessName || branding.companyName}</strong></p>
        ${showSignature && branding.signatureUrl ? `<img src="${branding.signatureUrl}" style="max-width: 100px; max-height: 50px; margin: 8px auto; display: block;" alt="Signature" />` : ''}
        ${showStamp && branding.stampUrl ? `<img src="${branding.stampUrl}" style="max-width: 80px; max-height: 80px; margin: 8px auto; display: block;" alt="Stamp" />` : ''}
        ${!branding.signatureUrl ? '<p style="margin-top: 8px;"><em>This is a computer generated invoice no signature required.</em></p>' : ''}
        <p style="margin-top: 8px;"><strong>Authorized Signatory</strong></p>
      </div>
      ` : ''}
    </div>
    </div>
  </div>
</body>
</html>
    `.trim()
      .replace(/{{primaryColor}}/g, primaryColor)
      .replace(/{{accentColor}}/g, accentColor);
  }

  /**
   * Template methods (keeping for compatibility, but will use HTML generation instead)
   */
  private generateClassicTemplate(data: InvoiceData, config: any): any {
    // Placeholder - HTML generation is now used instead of pdfMake templates
    return null;
  }
}

