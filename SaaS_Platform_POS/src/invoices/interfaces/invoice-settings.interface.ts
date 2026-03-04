/**
 * Invoice Settings Interfaces
 * 
 * Strongly-typed configuration for per-location invoice customization
 * with tenant-level defaults and settings inheritance.
 */

/**
 * Template configuration - which fields to show/hide
 */
export interface InvoiceTemplateConfig {
  // Layout components
  showLogo: boolean;
  showCompanyAddress: boolean;
  showCustomerAddress: boolean;
  
  // Tax & Compliance
  showGST: boolean;
  showHSN: boolean;
  showSAC: boolean;
  showPAN: boolean;
  
  // Item details
  showItemCode: boolean;
  showItemDescription: boolean;
  showUnit: boolean;
  showDiscount: boolean;
  
  // Footer components
  showBankDetails: boolean;
  showPaymentTerms: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showQRCode: boolean;
  showNotes: boolean;
  showTermsConditions: boolean;
  
  // Additional fields
  showShippingCharge: boolean;
  showRoundOff: boolean;
}

/**
 * Branding & Identity per location
 */
export interface InvoiceBranding {
  // Visual identity
  logoUrl: string | null;
  logoPosition: 'left' | 'center' | 'right';
  logoWidth: number; // pixels
  primaryColor: string; // hex color
  accentColor: string; // hex color
  
  // Company details (can differ per location)
  businessName: string;
  tagline: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string | null;
  
  // Tax identifiers
  gstNumber: string | null;
  panNumber: string | null;
  cinNumber: string | null; // Corporate Identification Number
  
  // Signature & Stamp
  signatureUrl: string | null;
  signatureText: string | null; // "Authorized Signatory"
  stampUrl: string | null;
}

/**
 * Bank details for payment instructions
 */
export interface BankDetails {
  enabled: boolean;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
  branchName: string | null;
  accountType: 'SAVINGS' | 'CURRENT' | null;
  upiId: string | null;
  qrCodeUrl: string | null; // Payment QR code
}

/**
 * Numbering configuration
 */
export interface InvoiceNumbering {
  prefix: string; // 'INV', 'SI', custom per location
  format: '{PREFIX}{YYYYMM}{SEQ}' | '{PREFIX}{YYYY}{SEQ}' | '{PREFIX}{SEQ}';
  sequenceLength: number; // padding zeros, e.g., 6 = 000001
  startNumber: number; // reset sequence from this number
  resetFrequency: 'NEVER' | 'YEARLY' | 'MONTHLY';
}

/**
 * Text defaults
 */
export interface InvoiceTextDefaults {
  paymentTerms: string; // 'Net 30', 'Due on Receipt'
  notes: string | null; // Default notes for all invoices
  termsConditions: string | null; // Legal T&C
  thankYouMessage: string | null; // "Thank you for your business!"
  
  // Item descriptions
  defaultUnit: string; // 'PCS', 'KG', 'L'
  taxLabel: string; // 'GST', 'VAT', 'Tax'
}

/**
 * Email settings
 */
export interface InvoiceEmailSettings {
  enabled: boolean;
  subject: string; // "Invoice #{invoiceNumber} from {businessName}"
  bodyTemplate: string; // HTML email body
  ccEmails: string[]; // Always CC these addresses
  attachPDF: boolean;
}

/**
 * Complete invoice settings for a location
 */
export interface LocationInvoiceSettings {
  // Feature flags
  enabled: boolean;
  requireApproval: boolean; // Manager approval before sending
  autoEmailCustomer: boolean;
  
  // Template selection
  defaultTemplateId: 'template-1' | 'template-2' | 'template-3' | 'template-4' | 'template-5';
  defaultTemplateConfig: InvoiceTemplateConfig;
  
  // Per-template configs (allow saving different configs for each template)
  templateOverrides: {
    [templateId: string]: Partial<InvoiceTemplateConfig>;
  };
  
  // Branding
  branding: InvoiceBranding;
  
  // Banking
  bankDetails: BankDetails;
  
  // Numbering
  numbering: InvoiceNumbering;
  
  // Defaults
  textDefaults: InvoiceTextDefaults;
  
  // Email settings
  emailSettings: InvoiceEmailSettings;
  
  // Metadata
  lastModified: string; // ISO timestamp
  modifiedBy: string; // User ID
}

/**
 * System-wide defaults (fallback when tenant/location not configured)
 */
export const SYSTEM_DEFAULT_INVOICE_SETTINGS: LocationInvoiceSettings = {
  enabled: true,
  requireApproval: false,
  autoEmailCustomer: false,
  
  defaultTemplateId: 'template-1',
  defaultTemplateConfig: {
    showLogo: true,
    showCompanyAddress: true,
    showCustomerAddress: true,
    showGST: true,
    showHSN: true,
    showSAC: false,
    showPAN: true,
    showItemCode: true,
    showItemDescription: false,
    showUnit: true,
    showDiscount: true,
    showBankDetails: true,
    showPaymentTerms: true,
    showSignature: true,
    showStamp: false,
    showQRCode: false,
    showNotes: true,
    showTermsConditions: true,
    showShippingCharge: true,
    showRoundOff: true,
  },
  
  templateOverrides: {},
  
  branding: {
    logoUrl: null,
    logoPosition: 'left',
    logoWidth: 150,
    primaryColor: '#2563eb',
    accentColor: '#1e40af',
    businessName: '',
    tagline: null,
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: null,
    gstNumber: null,
    panNumber: null,
    cinNumber: null,
    signatureUrl: null,
    signatureText: 'Authorized Signatory',
    stampUrl: null,
  },
  
  bankDetails: {
    enabled: false,
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: '',
    branchName: null,
    accountType: null,
    upiId: null,
    qrCodeUrl: null,
  },
  
  numbering: {
    prefix: 'INV',
    format: '{PREFIX}{YYYYMM}{SEQ}',
    sequenceLength: 6,
    startNumber: 1,
    resetFrequency: 'YEARLY',
  },
  
  textDefaults: {
    paymentTerms: 'Net 30',
    notes: null,
    termsConditions: null,
    thankYouMessage: 'Thank you for your business!',
    defaultUnit: 'PCS',
    taxLabel: 'GST',
  },
  
  emailSettings: {
    enabled: false,
    subject: 'Invoice #{invoiceNumber} from {businessName}',
    bodyTemplate: `Dear {customerName},\n\nPlease find attached invoice #{invoiceNumber} dated {invoiceDate}.\n\nAmount: {totalAmount}\nDue Date: {dueDate}\n\nThank you for your business!`,
    ccEmails: [],
    attachPDF: true,
  },
  
  lastModified: new Date().toISOString(),
  modifiedBy: 'system',
};
