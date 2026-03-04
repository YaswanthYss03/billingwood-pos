// Role-based permissions configuration
export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN';

export type PagePermission = {
  path: string;
  roles: UserRole[];
  name: string;
};

export const PAGE_PERMISSIONS: PagePermission[] = [
  { path: '/admin', roles: ['SUPER_ADMIN'], name: 'Admin Dashboard' },
  { path: '/dashboard', roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'], name: 'Dashboard' },
  { path: '/categories', roles: ['OWNER', 'MANAGER'], name: 'Categories' },
  { path: '/items', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'Items' },
  { path: '/pos', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'POS' },
  { path: '/orders', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'Orders' },
  { path: '/invoices', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'Invoices' },
  { path: '/kot', roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'], name: 'KOT' },
  { path: '/tables', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'Tables' },
  { path: '/inventory', roles: ['OWNER', 'MANAGER'], name: 'Inventory' },
  { path: '/ingredients', roles: ['OWNER', 'MANAGER'], name: 'Ingredients' },
  { path: '/vendors', roles: ['OWNER', 'MANAGER'], name: 'Vendors' },
  { path: '/recipes', roles: ['OWNER', 'MANAGER'], name: 'Recipes' },
  { path: '/wastage', roles: ['OWNER', 'MANAGER'], name: 'Wastage' },
  { path: '/reports', roles: ['OWNER', 'MANAGER'], name: 'Reports' },
  { path: '/users', roles: ['OWNER'], name: 'Users' },
  { path: '/settings', roles: ['OWNER', 'MANAGER'], name: 'Settings' },
  { path: '/settings/invoice-settings', roles: ['OWNER', 'MANAGER'], name: 'Invoice Settings' },
  { path: '/pricing', roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'], name: 'Pricing' },
  { path: '/customers', roles: ['OWNER', 'MANAGER', 'CASHIER'], name: 'Customers' },
  { path: '/locations', roles: ['OWNER', 'MANAGER'], name: 'Locations' },
  { path: '/analytics', roles: ['OWNER', 'MANAGER'], name: 'Analytics' },
  { path: '/about', roles: ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'], name: 'About' },
];

/**
 * Check if a user role has permission to access a specific page
 */
export function hasPageAccess(userRole: string | undefined, pagePath: string): boolean {
  if (!userRole) return false;

  const pagePermission = PAGE_PERMISSIONS.find(p => pagePath.startsWith(p.path));
  if (!pagePermission) return false;

  return pagePermission.roles.includes(userRole as UserRole);
}

/**
 * Get the default landing page for a user role
 */
export function getDefaultPageForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'OWNER':
    case 'MANAGER':
      return '/dashboard';
    case 'CASHIER':
      return '/pos';
    case 'KITCHEN':
      return '/kot';
    default:
      return '/dashboard';
  }
}

/**
 * Get all accessible pages for a user role
 */
export function getAccessiblePages(role: UserRole): PagePermission[] {
  return PAGE_PERMISSIONS.filter(page => page.roles.includes(role));
}
