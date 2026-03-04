/**
 * Subscription Plans Configuration
 * Defines features and limits for each plan tier
 */

import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

// Re-export Prisma enums
export { SubscriptionPlan, SubscriptionStatus };

export interface PlanFeatures {
  // Core Features
  basicPOS: boolean;
  inventory: boolean;
  reporting: boolean;
  
  // User Management
  maxUsers: number | 'unlimited';
  roleBasedAccess: boolean;
  staffPerformanceTracking: boolean;
  
  // Location Management
  maxLocations: number;
  multiLocationManagement: boolean;
  stockTransfers: boolean;
  locationWiseReports: boolean;
  
  // Inventory Features
  maxItems: number | 'unlimited';
  fifoTracking: boolean;
  batchTracking: boolean;
  expiryManagement: boolean;
  autoReorderAlerts: boolean;
  wasteTracking: boolean;
  
  // Professional Inventory Features
  vendorManagement: boolean;        // Vendor CRUD, tracking
  smartReordering: boolean;         // Sales velocity-based reorder alerts
  purchaseOrders: boolean;          // PO workflow (DRAFT → ORDERED → RECEIVED)
  recipeManagement: boolean;        // BOM/Recipe with auto-deduction
  wastageTracking: boolean;         // Expired/damaged tracking
  
  // Billing Features
  maxBillsPerMonth: number | 'unlimited';
  kotManagement: boolean;
  splitPayments: boolean;
  receiptCustomization: boolean;
  
  // CRM & Customer Management
  customerDatabase: boolean;
  customerHistory: boolean;
  loyaltyProgram: boolean;
  tieredMembership: boolean;
  birthdayRewards: boolean;
  smsEmailCampaigns: boolean;
  
  // Invoice Management (RETAIL only)
  invoiceManagement: boolean;       // Create/manage invoices with PDF generation
  
  // Analytics & Reports
  basicReports: boolean;
  advancedAnalytics: boolean;
  revenueForecasting: boolean;
  profitMarginAnalysis: boolean;
  customerInsights: boolean;
  customReportBuilder: boolean;
  scheduledReports: boolean;
  exportToPDF: boolean;
  exportToExcel: boolean;
  
  // Integrations
  paymentGateway: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  accountingSoftwareSync: boolean;
  ecommerceSync: boolean;
  whatsappIntegration: boolean;
  
  // Automation
  automatedAlerts: boolean;
  scheduledTasks: boolean;
  autoBackup: boolean;
  
  // Support
  support: 'community' | 'email' | 'priority' | 'dedicated';
  responseTime: string; // '24-48h', '<4h', '<1h'
  onboarding: boolean;
  training: boolean;
  
  // Customization
  customBranding: boolean;
  whiteLabel: boolean;
  customDomain: boolean;
}

export interface PlanLimits {
  maxUsers: number | 'unlimited';
  maxLocations: number;
  maxItems: number | 'unlimited';
  maxBillsPerMonth: number | 'unlimited';
  maxCustomers: number | 'unlimited';
  maxStorageGB: number;
  apiCallsPerDay: number | 'unlimited';
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeatures;
  limits: PlanLimits;
}> = {
  // ==========================================
  // FREE TRIAL (7 days of Professional)
  // ==========================================
  [SubscriptionPlan.FREE_TRIAL]: {
    name: 'Free Trial',
    description: 'Try all Professional features free for 7 days',
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      // Same as Professional (all features enabled)
      basicPOS: true,
      inventory: true,
      reporting: true,
      
      maxUsers: 'unlimited',
      roleBasedAccess: true,
      staffPerformanceTracking: true,
      
      maxLocations: 5,
      multiLocationManagement: true,
      stockTransfers: true,
      locationWiseReports: true,
      
      maxItems: 'unlimited',
      fifoTracking: true,
      batchTracking: true,
      expiryManagement: true,
      autoReorderAlerts: true,
      wasteTracking: true,
      
      // Professional Inventory Features (enabled in trial)
      vendorManagement: true,
      smartReordering: true,
      purchaseOrders: true,
      recipeManagement: true,
      wastageTracking: true,
      
      maxBillsPerMonth: 'unlimited',
      kotManagement: true,
      splitPayments: true,
      receiptCustomization: true,
      
      customerDatabase: true,
      customerHistory: true,
      loyaltyProgram: true,
      tieredMembership: true,
      birthdayRewards: true,
      smsEmailCampaigns: false, // Disabled in trial
      
      invoiceManagement: true, // Enabled in trial
      
      basicReports: true,
      advancedAnalytics: true,
      revenueForecasting: true,
      profitMarginAnalysis: true,
      customerInsights: true,
      customReportBuilder: true,
      scheduledReports: true,
      exportToPDF: true,
      exportToExcel: true,
      
      paymentGateway: true,
      apiAccess: false, // Disabled in trial
      webhooks: false,
      accountingSoftwareSync: false,
      ecommerceSync: false,
      whatsappIntegration: false,
      
      automatedAlerts: true,
      scheduledTasks: true,
      autoBackup: true,
      
      support: 'email',
      responseTime: '24-48h',
      onboarding: true,
      training: false,
      
      customBranding: false,
      whiteLabel: false,
      customDomain: false,
    },
    limits: {
      maxUsers: 5, // Limited in trial
      maxLocations: 2, // Limited in trial
      maxItems: 100, // Limited in trial
      maxBillsPerMonth: 200, // Limited in trial
      maxCustomers: 100,
      maxStorageGB: 1,
      apiCallsPerDay: 0,
    },
  },
  
  // ==========================================
  // STARTER PLAN
  // ==========================================
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    description: 'Perfect for single-location small businesses',
    priceMonthly: 499,
    priceYearly: 4990, // ~₹416/month (Save ₹1,000)
    features: {
      basicPOS: true,
      inventory: true,
      reporting: true,
      
      maxUsers: 3,
      roleBasedAccess: true,
      staffPerformanceTracking: false,
      
      maxLocations: 1,
      multiLocationManagement: false,
      stockTransfers: false,
      locationWiseReports: false,
      
      maxItems: 'unlimited',
      fifoTracking: true,
      batchTracking: true,
      expiryManagement: true,
      autoReorderAlerts: false,
      wasteTracking: false,
      
      // Professional Inventory Features (disabled in Starter)
      vendorManagement: false,
      smartReordering: false,
      purchaseOrders: false,
      recipeManagement: false,
      wastageTracking: false,
      
      maxBillsPerMonth: 'unlimited',
      kotManagement: true,
      splitPayments: false,
      receiptCustomization: true,
      
      customerDatabase: false,
      customerHistory: false,
      loyaltyProgram: false,
      tieredMembership: false,
      birthdayRewards: false,
      smsEmailCampaigns: false,
      
      invoiceManagement: false, // Professional feature
      
      basicReports: true,
      advancedAnalytics: false,
      revenueForecasting: false,
      profitMarginAnalysis: false,
      customerInsights: false,
      customReportBuilder: false,
      scheduledReports: false,
      exportToPDF: true,
      exportToExcel: true,
      
      paymentGateway: false,
      apiAccess: false,
      webhooks: false,
      accountingSoftwareSync: false,
      ecommerceSync: false,
      whatsappIntegration: false,
      
      automatedAlerts: false,
      scheduledTasks: false,
      autoBackup: true,
      
      support: 'email',
      responseTime: '24-48h',
      onboarding: true,
      training: false,
      
      customBranding: false,
      whiteLabel: false,
      customDomain: false,
    },
    limits: {
      maxUsers: 3,
      maxLocations: 1,
      maxItems: 'unlimited',
      maxBillsPerMonth: 'unlimited',
      maxCustomers: 0,
      maxStorageGB: 2,
      apiCallsPerDay: 0,
    },
  },
  
  // ==========================================
  // PROFESSIONAL PLAN
  // ==========================================
  [SubscriptionPlan.PROFESSIONAL]: {
    name: 'Professional',
    description: 'For growing businesses with multiple locations',
    priceMonthly: 1499,
    priceYearly: 14990, // ~₹1,249/month (Save ₹3,000)
    features: {
      basicPOS: true,
      inventory: true,
      reporting: true,
      
      maxUsers: 'unlimited',
      roleBasedAccess: true,
      staffPerformanceTracking: true,
      
      maxLocations: 5,
      multiLocationManagement: true,
      stockTransfers: true,
      locationWiseReports: true,
      
      maxItems: 'unlimited',
      fifoTracking: true,
      batchTracking: true,
      expiryManagement: true,
      autoReorderAlerts: true,
      wasteTracking: true,
      
      // Professional Inventory Features (enabled)
      vendorManagement: true,
      smartReordering: true,
      purchaseOrders: true,
      recipeManagement: true,
      wastageTracking: true,
      
      maxBillsPerMonth: 'unlimited',
      kotManagement: true,
      splitPayments: true,
      receiptCustomization: true,
      
      customerDatabase: true,
      customerHistory: true,
      loyaltyProgram: true,
      tieredMembership: true,
      birthdayRewards: true,
      smsEmailCampaigns: true,
      
      invoiceManagement: true, // Enabled for Professional
      
      basicReports: true,
      advancedAnalytics: true,
      revenueForecasting: true,
      profitMarginAnalysis: true,
      customerInsights: true,
      customReportBuilder: true,
      scheduledReports: true,
      exportToPDF: true,
      exportToExcel: true,
      
      paymentGateway: true,
      apiAccess: true,
      webhooks: true,
      accountingSoftwareSync: true,
      ecommerceSync: false,
      whatsappIntegration: true,
      
      automatedAlerts: true,
      scheduledTasks: true,
      autoBackup: true,
      
      support: 'priority',
      responseTime: '<4h',
      onboarding: true,
      training: true,
      
      customBranding: true,
      whiteLabel: false,
      customDomain: false,
    },
    limits: {
      maxUsers: 'unlimited',
      maxLocations: 5,
      maxItems: 'unlimited',
      maxBillsPerMonth: 'unlimited',
      maxCustomers: 'unlimited',
      maxStorageGB: 10,
      apiCallsPerDay: 10000,
    },
  },
  
  // ==========================================
  // ENTERPRISE PLAN
  // ==========================================
  [SubscriptionPlan.ENTERPRISE]: {
    name: 'Enterprise',
    description: 'Custom solutions for large businesses',
    priceMonthly: 4999,
    priceYearly: 49990, // ~₹4,166/month (Save ₹10,000)
    features: {
      basicPOS: true,
      inventory: true,
      reporting: true,
      
      maxUsers: 'unlimited',
      roleBasedAccess: true,
      staffPerformanceTracking: true,
      
      maxLocations: 'unlimited' as any,
      multiLocationManagement: true,
      stockTransfers: true,
      locationWiseReports: true,
      
      maxItems: 'unlimited',
      fifoTracking: true,
      batchTracking: true,
      expiryManagement: true,
      autoReorderAlerts: true,
      wasteTracking: true,
      
      // Professional Inventory Features (enabled)
      vendorManagement: true,
      smartReordering: true,
      purchaseOrders: true,
      recipeManagement: true,
      wastageTracking: true,
      
      maxBillsPerMonth: 'unlimited',
      kotManagement: true,
      splitPayments: true,
      receiptCustomization: true,
      
      customerDatabase: true,
      customerHistory: true,
      loyaltyProgram: true,
      tieredMembership: true,
      birthdayRewards: true,
      smsEmailCampaigns: true,
      
      invoiceManagement: true, // Enabled for Enterprise
      
      basicReports: true,
      advancedAnalytics: true,
      revenueForecasting: true,
      profitMarginAnalysis: true,
      customerInsights: true,
      customReportBuilder: true,
      scheduledReports: true,
      exportToPDF: true,
      exportToExcel: true,
      
      paymentGateway: true,
      apiAccess: true,
      webhooks: true,
      accountingSoftwareSync: true,
      ecommerceSync: true,
      whatsappIntegration: true,
      
      automatedAlerts: true,
      scheduledTasks: true,
      autoBackup: true,
      
      support: 'dedicated',
      responseTime: '<1h',
      onboarding: true,
      training: true,
      
      customBranding: true,
      whiteLabel: true,
      customDomain: true,
    },
    limits: {
      maxUsers: 'unlimited',
      maxLocations: 'unlimited' as any,
      maxItems: 'unlimited',
      maxBillsPerMonth: 'unlimited',
      maxCustomers: 'unlimited',
      maxStorageGB: 100,
      apiCallsPerDay: 'unlimited',
    },
  },
};

/**
 * Feature names mapped to their plan configuration keys
 */
export const FEATURE_KEYS = {
  MULTI_LOCATION: 'multiLocationManagement',
  CRM: 'customerDatabase',
  LOYALTY: 'loyaltyProgram',
  ADVANCED_ANALYTICS: 'advancedAnalytics',
  PAYMENT_GATEWAY: 'paymentGateway',
  API_ACCESS: 'apiAccess',
  AUTO_REORDER: 'autoReorderAlerts',
  SPLIT_PAYMENTS: 'splitPayments',
  SCHEDULED_REPORTS: 'scheduledReports',
  CUSTOM_BRANDING: 'customBranding',
  WASTAGE_TRACKING: 'wasteTracking',
  STAFF_PERFORMANCE: 'staffPerformanceTracking',
} as const;

/**
 * Trial configuration
 */
export const TRIAL_CONFIG = {
  durationDays: 7,
  plan: SubscriptionPlan.FREE_TRIAL,
  features: SUBSCRIPTION_PLANS[SubscriptionPlan.FREE_TRIAL].features,
};
