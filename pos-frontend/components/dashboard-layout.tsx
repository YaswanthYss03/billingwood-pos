'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useTenantConfig } from '@/lib/useTenantConfig';
import { PAGE_PERMISSIONS } from '@/lib/permissions';
import { useSubscription } from '@/contexts/subscription-context';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  Users,
  LogOut,
  TicketCheck,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FolderOpen,
  MapPin,
  UserCheck,
  BarChart3,
  Lock,
  DollarSign,
  Building2,
  ChefHat,
  Trash2,
  Soup,
  Menu,
  X,
  UtensilsCrossed,
  Receipt,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  '/dashboard': LayoutDashboard,
  '/categories': FolderOpen,
  '/items': Package,
  '/pos': ShoppingCart,
  '/orders': ClipboardList,
  '/invoices': Receipt,
  '/kot': TicketCheck,
  '/tables': UtensilsCrossed,
  '/inventory': FileText,
  '/ingredients': Soup,
  '/vendors': Building2,
  '/recipes': ChefHat,
  '/wastage': Trash2,
  '/reports': TrendingUp,
  '/users': Users,
  '/settings': Settings,
  '/settings/invoice-settings': Receipt,
  '/about': Info,
  '/customers': UserCheck,
  '/locations': MapPin,
  '/analytics': BarChart3,
  '/pricing': DollarSign,
};

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  isCollapsed,
  isSidebarCollapsed,
  onSidebarExpand,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  isCollapsed: boolean;
  isSidebarCollapsed: boolean;
  onSidebarExpand: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`section_${title}_expanded`);
      return saved === null ? true : saved === 'true';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem(`section_${title}_expanded`, isExpanded.toString());
  }, [isExpanded, title]);

  const handleClick = () => {
    if (isSidebarCollapsed) {
      // Expand sidebar and this section
      onSidebarExpand();
      setIsExpanded(true);
    } else {
      // Just toggle this section
      setIsExpanded(!isExpanded);
    }
  };

  if (isSidebarCollapsed) {
    // When sidebar is collapsed on desktop, show icon with click to expand
    return (
      <div className="relative group hidden lg:block">
        <div 
          onClick={handleClick}
          className="flex items-center justify-center px-2 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
        >
          <Icon className="h-6 w-6" />
        </div>
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {title}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={handleClick}
        className={`flex items-center w-full px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
      >
        <Icon className="h-6 w-6 mr-2" />
        <span className="flex-1 text-left">{title}</span>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>
      {isExpanded && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

// Navigation item component
function NavItem({
  item,
  pathname,
  isCollapsed,
  isInGroup = false,
}: {
  item: { name: string; href: string; icon: any; locked: boolean };
  pathname: string | null;
  isCollapsed: boolean;
  isInGroup?: boolean;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`flex items-center ${isInGroup ? 'px-6' : 'px-4'} ${isCollapsed ? 'lg:justify-center lg:px-2' : ''} py-3 text-sm font-medium rounded-lg transition-all ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
          : item.locked
          ? 'text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      title={isCollapsed ? item.name : ''}
    >
      <Icon className={`h-6 w-6 mr-3 ${isCollapsed ? 'lg:mr-0' : ''} ${isInGroup && !isCollapsed ? 'opacity-70' : ''}`} />
      <span className={`flex-1 ${isCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
      {item.locked && <Lock className={`h-4 w-4 text-gray-400 dark:text-gray-600 ${isCollapsed ? 'lg:hidden' : ''}`} />}
    </Link>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, tenant } = useAuthStore();
  const { kotEnabled, canConfigureKOT } = useTenantConfig();
  const { subscription, hasFeature } = useSubscription();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Build navigation dynamically based on user role and business settings
  const allPages = PAGE_PERMISSIONS
    .filter(page => {
      // Check if user has required role
      if (!user || !page.roles.includes(user.role as any)) {
        return false;
      }

      // Filter KOT based on business settings
      if (page.path === '/kot' && !kotEnabled) {
        return false;
      }

      // Settings page is now available for all business types and locations
      // No filtering needed for /settings anymore

      // Filter Recipes - only for RESTAURANT, HOTEL, CAFE business types
      if (page.path === '/recipes') {
        const allowedTypes = ['RESTAURANT', 'HOTEL', 'CAFE'];
        if (!tenant?.businessType || !allowedTypes.includes(tenant.businessType)) {
          return false;
        }
      }

      // Filter Invoices - only for RETAIL business type
      if (page.path === '/invoices') {
        if (!tenant?.businessType || tenant.businessType !== 'RETAIL') {
          return false;
        }
      }

      // Filter Invoice Settings - only for RETAIL business type
      if (page.path === '/settings/invoice-settings') {
        if (!tenant?.businessType || tenant.businessType !== 'RETAIL') {
          return false;
        }
      }

      return true;
    })
    .map(page => {
      // Determine if Professional feature is locked
      let locked = false;
      if (page.path === '/customers') {
        locked = !hasFeature('customerDatabase');
      } else if (page.path === '/locations') {
        locked = !hasFeature('multiLocationManagement');
      } else if (page.path === '/analytics') {
        locked = !hasFeature('advancedAnalytics');
      } else if (page.path === '/vendors') {
        locked = !hasFeature('vendorManagement');
      } else if (page.path === '/recipes') {
        locked = !hasFeature('recipeManagement');
      } else if (page.path === '/wastage') {
        locked = !hasFeature('wastageTracking');
      } else if (page.path === '/invoices') {
        locked = !hasFeature('invoiceManagement');
      }

      return {
        name: page.name,
        href: page.path,
        icon: iconMap[page.path] || LayoutDashboard,
        locked,
      };
    });

  // Categorize navigation items
  const mainNavPaths = ['/dashboard', '/pos', '/orders', '/invoices', '/kot', '/tables', '/items', '/inventory'];
  const managementPaths = ['/categories', '/ingredients', '/recipes', '/vendors', '/wastage'];
  const insightsPaths = ['/reports', '/analytics'];
  const settingsPaths = ['/users', '/settings', '/settings/invoice-settings', '/pricing', '/customers', '/locations', '/about'];

  const mainNavigation = allPages.filter(item => mainNavPaths.includes(item.href));
  const managementItems = allPages.filter(item => managementPaths.includes(item.href));
  const insightsItems = allPages.filter(item => insightsPaths.includes(item.href));
  const settingsItems = allPages.filter(item => settingsPaths.includes(item.href));

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ease-in-out flex flex-col
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-64
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Toggle Button - Desktop Only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 z-50 h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute right-4 top-4 z-50 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <div className="flex h-16 items-center justify-center border-b dark:border-gray-700 flex-shrink-0">
          <h1 className={`text-xl font-bold text-blue-600 dark:text-blue-400 ${isCollapsed ? 'lg:hidden' : ''}`}>
            POS System
          </h1>
          {isCollapsed && (
            <h1 className="hidden lg:block text-xl font-bold text-blue-600 dark:text-blue-400">POS</h1>
          )}
        </div>

        {/* Business Info */}
        {tenant && (
          <div className={`px-4 py-3 border-b dark:border-gray-700 flex items-center gap-2 flex-wrap flex-shrink-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {tenant.businessType}
            </span>
            {canConfigureKOT && kotEnabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                KOT
              </span>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Main Navigation */}
          {mainNavigation.map((item) => (
            <NavItem key={item.name} item={item} pathname={pathname} isCollapsed={isCollapsed} />
          ))}

          {/* Divider */}
          {(managementItems.length > 0 || insightsItems.length > 0 || settingsItems.length > 0) && (
            <div className="my-3 border-t border-gray-200 dark:border-gray-700"></div>
          )}

          {/* Management Section */}
          {managementItems.length > 0 && (
            <CollapsibleSection
              title="Management"
              icon={FolderOpen}
              isCollapsed={false}
              isSidebarCollapsed={isCollapsed}
              onSidebarExpand={() => setIsCollapsed(false)}
            >
              {managementItems.map((item) => (
                <NavItem key={item.name} item={item} pathname={pathname} isCollapsed={isCollapsed} isInGroup={true} />
              ))}
            </CollapsibleSection>
          )}

          {/* Insights Section */}
          {insightsItems.length > 0 && (
            <CollapsibleSection
              title="Insights"
              icon={BarChart3}
              isCollapsed={false}
              isSidebarCollapsed={isCollapsed}
              onSidebarExpand={() => setIsCollapsed(false)}
            >
              {insightsItems.map((item) => (
                <NavItem key={item.name} item={item} pathname={pathname} isCollapsed={isCollapsed} isInGroup={true} />
              ))}
            </CollapsibleSection>
          )}

          {/* Settings Section */}
          {settingsItems.length > 0 && (
            <CollapsibleSection
              title="Settings"
              icon={Settings}
              isCollapsed={false}
              isSidebarCollapsed={isCollapsed}
              onSidebarExpand={() => setIsCollapsed(false)}
            >
              {settingsItems.map((item) => (
                <NavItem key={item.name} item={item} pathname={pathname} isCollapsed={isCollapsed} isInGroup={true} />
              ))}
            </CollapsibleSection>
          )}
        </nav>

        <div className="border-t dark:border-gray-700 p-4 flex-shrink-0">
          <div className={`mb-3 px-4 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={`h-6 w-6 mr-3 ${isCollapsed ? 'lg:mr-0' : ''}`} />
            <span className={isCollapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">POS System</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
