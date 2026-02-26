import axios from 'axios';
import { getAccessToken } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap backend's {success: true, data: ...} structure
    // If response has `data` property with nested `data`, unwrap it
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // Don't redirect to login for certain non-critical API calls
    const nonCriticalPaths = ['/auth/me', '/tenants/settings'];
    const isNonCritical = nonCriticalPaths.some(path => error.config?.url?.includes(path));
    
    // Only redirect to login if it's a 401 and not a non-critical call
    if (error.response?.status === 401 && !isNonCritical) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints
export const api = {
  // Auth
  auth: {
    login: (data: { username: string; password: string }) => 
      apiClient.post('/auth/login', data),
    me: () => apiClient.get('/auth/me'),
  },

  // Categories
  categories: {
    list: () => apiClient.get('/categories'),
    get: (id: string) => apiClient.get(`/categories/${id}`),
    create: (data: any) => apiClient.post('/categories', data),
    update: (id: string, data: any) => apiClient.patch(`/categories/${id}`, data),
    delete: (id: string) => apiClient.delete(`/categories/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/categories/${id}/toggle-status`),
  },

  // Items
  items: {
    list: (categoryId?: string) => 
      apiClient.get('/items', { params: { categoryId } }),
    get: (id: string) => apiClient.get(`/items/${id}`),
    getStock: (id: string, locationId?: string) => 
      apiClient.get(`/items/${id}/stock`, { params: { locationId } }),
    updateQuantity: (id: string, quantity: number, isIncrement: boolean = true) =>
      apiClient.patch(`/items/${id}/quantity`, { quantity, isIncrement }),
    prepareDishes: (id: string, quantity: number) =>
      apiClient.post(`/items/${id}/prepare`, { quantity }),
    create: (data: any) => apiClient.post('/items', data),
    update: (id: string, data: any) => apiClient.patch(`/items/${id}`, data),
    delete: (id: string) => apiClient.delete(`/items/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/items/${id}/toggle-status`),
  },

  // Ingredients (Starter Plan - Simple Inventory)
  ingredients: {
    list: () => apiClient.get('/ingredients'),
    get: (id: string) => apiClient.get(`/ingredients/${id}`),
    create: (data: { name: string; unit: string }) => apiClient.post('/ingredients', data),
    update: (id: string, data: { name?: string; unit?: string }) => apiClient.patch(`/ingredients/${id}`, data),
    updateQuantity: (id: string, quantity: number, isIncrement: boolean = true) =>
      apiClient.patch(`/ingredients/${id}/quantity`, { quantity, isIncrement }),
    delete: (id: string) => apiClient.delete(`/ingredients/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/ingredients/${id}/toggle-status`),
  },

  // Inventory
  inventory: {
    batches: (itemId?: string, locationId?: string) => 
      apiClient.get('/inventory/batches', { params: { itemId, locationId } }),
    getStock: (itemId: string, locationId?: string) => 
      apiClient.get(`/inventory/stock/${itemId}`, { params: { locationId } }),
    valuation: () => apiClient.get('/inventory/valuation'),
    lowStock: (threshold?: number) => 
      apiClient.get('/inventory/low-stock', { params: { threshold } }),
    adjust: (data: any) => apiClient.post('/inventory/adjust', data),
  },

  // Purchases
  purchases: {
    list: (status?: string) => 
      apiClient.get('/purchases', { params: { status } }),
    get: (id: string) => apiClient.get(`/purchases/${id}`),
    create: (data: any) => apiClient.post('/purchases', data),
    receive: (id: string, data?: any) => apiClient.post(`/purchases/${id}/receive`, data),
    cancel: (id: string, reason: string) => 
      apiClient.patch(`/purchases/${id}/cancel`, { reason }),
  },

  // Billing
  billing: {
    list: (params?: any) => apiClient.get('/billing', { params }),
    get: (id: string) => apiClient.get(`/billing/${id}`),
    getByNumber: (billNumber: string) => 
      apiClient.get(`/billing/number/${billNumber}`),
    create: (data: any) => apiClient.post('/billing', data),
    cancel: (id: string, reason: string) => 
      apiClient.post(`/billing/${id}/cancel`, { reason }),
  },

  // KOT
  kot: {
    list: (status?: string) => 
      apiClient.get('/kot', { params: { status } }),
    get: (id: string) => apiClient.get(`/kot/${id}`),
    create: (data: any) => apiClient.post('/kot', data),
    updateStatus: (id: string, status: string) => 
      apiClient.patch(`/kot/${id}/status`, { status }),
    cancel: (id: string, reason: string) => 
      apiClient.patch(`/kot/${id}/cancel`, { reason }),
  },

  // Printing
  printing: {
    pending: () => apiClient.get('/printing/pending'),
    list: (params?: any) => apiClient.get('/printing', { params }),
    get: (id: string) => apiClient.get(`/printing/${id}`),
    updateStatus: (id: string, status: string, error?: string) => 
      apiClient.patch(`/printing/${id}/status`, { status, error }),
    retry: (id: string) => apiClient.patch(`/printing/${id}/retry`),
  },

  // Reports
  reports: {
    dashboard: (refresh?: boolean) => 
      apiClient.get('/reports/dashboard', { params: { refresh: refresh ? 'true' : undefined } }),
    dailySales: (date?: string) => 
      apiClient.get('/reports/daily-sales', { params: { date } }),
    salesSummary: (startDate: string, endDate: string) => 
      apiClient.get('/reports/sales-summary', { params: { startDate, endDate } }),
    itemWiseSales: (startDate: string, endDate: string) => 
      apiClient.get('/reports/item-wise-sales', { params: { startDate, endDate } }),
    currentInventory: () => apiClient.get('/reports/current-inventory'),
    ingredientInventory: () => apiClient.get('/reports/ingredient-inventory'),
    inventoryValuation: () => apiClient.get('/reports/inventory-valuation'),
    topSelling: (days?: number, limit?: number) => 
      apiClient.get('/reports/top-selling', { params: { days, limit } }),
  },

  // Users
  users: {
    list: () => apiClient.get('/users'),
    get: (id: string) => apiClient.get(`/users/${id}`),
    create: (data: any) => apiClient.post('/users', data),
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/users/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/users/${id}/toggle-status`),
  },

  // Tenants/Settings
  tenants: {
    getConfig: () => apiClient.get('/tenants/config'),
    getSettings: () => apiClient.get('/tenants/settings'),
    updateSettings: (data: any) => apiClient.patch('/tenants/settings', data),
    update: (data: any) => apiClient.patch('/tenants', data),
  },

  // Subscription Management
  subscription: {
    getInfo: () => apiClient.get('/tenants/subscription/info'),
    getPlans: () => apiClient.get('/tenants/subscription/plans'),
    getUpgradeSuggestions: () => apiClient.get('/tenants/subscription/upgrade-suggestions'),
    upgrade: (data: any) => apiClient.post('/tenants/subscription/upgrade', data),
    cancel: (data: any) => apiClient.post('/tenants/subscription/cancel', data),
    reactivate: () => apiClient.post('/tenants/subscription/reactivate'),
  },

  // Locations (Professional feature)
  locations: {
    list: (includeInactive?: boolean) => 
      apiClient.get('/locations', { params: { includeInactive } }),
    get: (id: string) => apiClient.get(`/locations/${id}`),
    create: (data: any) => apiClient.post('/locations', data),
    update: (id: string, data: any) => apiClient.put(`/locations/${id}`, data),
    delete: (id: string) => apiClient.delete(`/locations/${id}`),
    getReport: (locationId?: string, startDate?: string, endDate?: string) =>
      apiClient.get('/locations/report', { params: { locationId, startDate, endDate } }),
  },

  // Stock Transfers (Professional feature)
  stockTransfers: {
    list: (locationId?: string, status?: string) =>
      apiClient.get('/locations/transfers', { params: { locationId, status } }),
    get: (id: string) => apiClient.get(`/locations/transfers/${id}`),
    create: (data: any) => apiClient.post('/locations/transfers', data),
    updateStatus: (id: string, status: string, notes?: string) =>
      apiClient.put(`/locations/transfers/${id}/status`, { status, notes }),
  },

  // Customers (Professional feature)
  customers: {
    list: (params?: any) => apiClient.get('/customers', { params }),
    get: (id: string) => apiClient.get(`/customers/${id}`),
    findByPhone: (phone: string) => apiClient.get(`/customers/phone/${phone}`),
    create: (data: any) => apiClient.post('/customers', data),
    update: (id: string, data: any) => apiClient.put(`/customers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/customers/${id}`),
    getInsights: () => apiClient.get('/customers/insights'),
    getBirthdays: (daysAhead?: number) =>
      apiClient.get('/customers/birthdays', { params: { daysAhead } }),
  },

  // Loyalty Program (Professional feature)
  loyalty: {
    earnPoints: (data: any) => apiClient.post('/customers/loyalty/earn', data),
    redeemPoints: (data: any) => apiClient.post('/customers/loyalty/redeem', data),
    adjustPoints: (data: any) => apiClient.post('/customers/loyalty/adjust', data),
    getTransactions: (customerId: string) =>
      apiClient.get(`/customers/${customerId}/loyalty/transactions`),
  },

  // Analytics (Professional feature)
  analytics: {
    revenueTrends: (startDate: string, endDate: string, groupBy?: 'day' | 'week' | 'month') =>
      apiClient.get('/analytics/revenue-trends', { params: { startDate, endDate, groupBy } }),
    profitMargin: (startDate: string, endDate: string) =>
      apiClient.get('/analytics/profit-margin', { params: { startDate, endDate } }),
    itemProfit: (startDate: string, endDate: string, limit?: number) =>
      apiClient.get('/analytics/item-profit', { params: { startDate, endDate, limit } }),
    peakHours: (days?: number) =>
      apiClient.get('/analytics/peak-hours', { params: { days } }),
    customerRetention: () => apiClient.get('/analytics/customer-retention'),
    categoryPerformance: (startDate: string, endDate: string) =>
      apiClient.get('/analytics/category-performance', { params: { startDate, endDate } }),
    comparativeReports: () =>
      apiClient.get('/analytics/comparative-reports'),
    deadStock: (daysThreshold?: number) =>
      apiClient.get('/analytics/dead-stock', { params: { daysThreshold } }),
    abcAnalysis: (startDate: string, endDate: string) =>
      apiClient.get('/analytics/abc-analysis', { params: { startDate, endDate } }),
    seasonalTrends: (yearsBack?: number) =>
      apiClient.get('/analytics/seasonal-trends', { params: { yearsBack } }),
  },

  // Vendors (Professional feature)
  vendors: {
    list: (includeInactive?: boolean) =>
      apiClient.get('/vendors', { params: { includeInactive } }),
    get: (id: string) => apiClient.get(`/vendors/${id}`),
    getStats: (id: string) => apiClient.get(`/vendors/${id}/stats`),
    create: (data: any) => apiClient.post('/vendors', data),
    update: (id: string, data: any) => apiClient.patch(`/vendors/${id}`, data),
    delete: (id: string) => apiClient.delete(`/vendors/${id}`),
    toggleActive: (id: string) => apiClient.patch(`/vendors/${id}/toggle-active`),
  },

  // Smart Reordering (Professional feature)
  reordering: {
    alerts: () => apiClient.get('/inventory/reorder-alerts'),
    salesVelocity: (itemId: string, days?: number) =>
      apiClient.get(`/inventory/sales-velocity/${itemId}`, { params: { days } }),
    suggestedQuantity: (itemId: string, daysOfSupply?: number) =>
      apiClient.get(`/inventory/suggested-purchase/${itemId}`, { params: { daysOfSupply } }),
  },

  // Wastage Tracking (Professional feature)
  wastage: {
    list: (params?: { startDate?: string; endDate?: string; reason?: string }) =>
      apiClient.get('/wastage', { params }),
    create: (data: any) => apiClient.post('/wastage', data),
    summary: (days?: number) =>
      apiClient.get('/wastage/summary', { params: { days } }),
    expiringItems: (daysThreshold?: number) =>
      apiClient.get('/wastage/expiring', { params: { daysThreshold } }),
    expiredItems: () => apiClient.get('/wastage/expired'),
  },

  // Recipe/BOM Management (Professional feature + RESTAURANT business type)
  recipes: {
    list: () => apiClient.get('/recipes'),
    get: (id: string) => apiClient.get(`/recipes/${id}`),
    getByFinishedGood: (finishedGoodId: string) =>
      apiClient.get(`/recipes/finished-good/${finishedGoodId}`),
    getCost: (id: string) => apiClient.get(`/recipes/${id}/cost`),
    checkAvailability: (finishedGoodId: string, quantity: number) =>
      apiClient.get(`/recipes/finished-good/${finishedGoodId}/check-availability`, { 
        params: { quantity } 
      }),
    create: (data: any) => apiClient.post('/recipes', data),
    update: (id: string, data: any) => apiClient.patch(`/recipes/${id}`, data),
    delete: (id: string) => apiClient.delete(`/recipes/${id}`),
  },

  // Table Management (Restaurant/Cafe/Hotel)
  tables: {
    list: (params?: { locationId?: string; status?: string }) =>
      apiClient.get('/tables', { params }),
    get: (id: string) => apiClient.get(`/tables/${id}`),
    getStats: (locationId: string) =>
      apiClient.get('/tables/stats', { params: { locationId } }),
    getAvailable: (locationId?: string, capacity?: number) =>
      apiClient.get('/tables/available', { params: { locationId, capacity } }),
    create: (data: any) => apiClient.post('/tables', data),
    update: (id: string, data: any) => apiClient.patch(`/tables/${id}`, data),
    delete: (id: string) => apiClient.delete(`/tables/${id}`),
    updateStatus: (id: string, status: string, kotId?: string) =>
      apiClient.patch(`/tables/${id}/status`, { status, kotId }),
    occupy: (id: string, kotId: string) =>
      apiClient.post(`/tables/${id}/occupy`, { kotId }),
    free: (id: string) => apiClient.post(`/tables/${id}/free`),
    move: (id: string, data: { section?: string; floor?: string; layoutZone?: string; positionX?: number; positionY?: number; rotation?: number; width?: number; height?: number; shape?: string }) =>
      apiClient.patch(`/tables/${id}/move`, data),
    bulkUpdatePositions: (updates: Array<{ id: string; positionX: number; positionY: number; rotation?: number }>) =>
      apiClient.patch('/tables/bulk-position', { updates }),
    
    // Reservations
    createReservation: (data: any) => apiClient.post('/tables/reservations', data),
    listReservations: (params?: { locationId?: string; status?: string; date?: string; tableId?: string; customerPhone?: string }) =>
      apiClient.get('/tables/reservations', { params }),
    getReservation: (id: string) => apiClient.get(`/tables/reservations/${id}`),
    getTodayReservations: (locationId?: string) =>
      apiClient.get('/tables/reservations/today', { params: { locationId } }),
    getUpcomingReservations: (locationId?: string, days?: number) =>
      apiClient.get('/tables/reservations/upcoming', { params: { locationId, days } }),
    updateReservation: (id: string, data: any) =>
      apiClient.patch(`/tables/reservations/${id}`, data),
    confirmReservation: (id: string) =>
      apiClient.patch(`/tables/reservations/${id}/confirm`),
    cancelReservation: (id: string, reason?: string) =>
      apiClient.patch(`/tables/reservations/${id}/cancel`, { reason }),
    markAsSeated: (id: string) =>
      apiClient.patch(`/tables/reservations/${id}/seated`),
    deleteReservation: (id: string) =>
      apiClient.delete(`/tables/reservations/${id}`),
  },

  // Admin (SUPER_ADMIN only)
  admin: {
    getTenants: () => apiClient.get('/admin/tenants'),
    createTenant: (data: any) => apiClient.post('/admin/tenants', data),
    getTenantDetails: (id: string) => apiClient.get(`/admin/tenants/${id}`),
    getStats: () => apiClient.get('/admin/stats'),
    updateSubscription: (tenantId: string, data: any) =>
      apiClient.patch(`/admin/tenants/${tenantId}/subscription`, data),
    toggleTenantStatus: (tenantId: string) =>
      apiClient.patch(`/admin/tenants/${tenantId}/toggle-status`),
  },
};
