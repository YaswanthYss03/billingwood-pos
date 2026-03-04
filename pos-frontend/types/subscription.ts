export enum SubscriptionPlan {
  FREE_TRIAL = 'FREE_TRIAL',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

export interface SubscriptionInfo {
  plan?: SubscriptionPlan; // Backend returns 'plan'
  currentPlan?: SubscriptionPlan; // Frontend compatibility
  status: SubscriptionStatus;
  isActive: boolean;
  features: PlanFeatures;
  limits: PlanLimits;
  trialEndsAt?: Date;
  renewsAt?: Date;
  daysRemaining?: number; // Backend returns 'daysRemaining'
  daysUntilRenewal?: number; // Frontend compatibility
}

export interface PlanFeatures {
  // Core Features
  basicPOS: boolean;
  inventory: boolean;
  reporting: boolean;
  
  // User Management
  maxUsers: number | 'unlimited';
  roleBasedAccess: boolean;
  staffPerformanceTracking: boolean;
  
  // Inventory Features
  batchTracking: boolean;
  expiryManagement: boolean;
  stockAlerts: boolean;
  barcodeScanningSupport: boolean;
  
  // Advanced Inventory Features (Professional Plan)
  vendorManagement?: boolean;
  smartReordering?: boolean;
  purchaseOrders?: boolean;
  recipeManagement?: boolean;
  wastageTracking?: boolean;
  
  // Location Management
  multiLocationManagement: boolean;
  stockTransfers: boolean;
  locationWiseReporting: boolean;
  centralizedInventory: boolean;
  maxLocations: number;
  
  // Customer Management
  customerDatabase: boolean;
  loyaltyProgram: boolean;
  birthdayRewards: boolean;
  customerInsights: boolean;
  
  // Invoice Management (RETAIL only)
  invoiceManagement?: boolean;
  
  // Advanced Features
  advancedAnalytics: boolean;
  profitMarginAnalysis: boolean;
  forecastingAI: boolean;
  customReports: boolean;
  
  // Integrations & API
  apiAccess: boolean;
  webhooks: boolean;
  thirdPartyIntegrations: boolean;
  whatsappIntegration: boolean;
  
  // Billing & Printing
  kotManagement: boolean;
  invoicePrinting: boolean;
  thermalPrinterSupport: boolean;
  customInvoiceTemplates: boolean;
  
  // Support & Training
  supportLevel: 'email' | 'priority' | 'dedicated';
  onboarding: boolean;
  training: boolean;
  dedicatedAccountManager: boolean;
  
  // Enterprise Features
  whiteLabel: boolean;
  customDomain: boolean;
  sla: boolean;
  backupFrequency: 'daily' | 'hourly' | 'realtime';
}

export interface PlanLimits {
  maxUsers: number | 'unlimited';
  maxLocations: number | 'unlimited';
  maxItems: number | 'unlimited';
  maxBillsPerMonth: number | 'unlimited';
  maxApiCallsPerDay: number | 'unlimited';
}

export interface PlanDetails {
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  description: string;
  features: PlanFeatures;
  limits: PlanLimits;
  popular?: boolean;
}

export interface UpgradePlanRequest {
  targetPlan: SubscriptionPlan;
  billingCycle: 'MONTHLY' | 'YEARLY';
}

export interface CancelSubscriptionRequest {
  reason: string;
  feedback?: string;
}
