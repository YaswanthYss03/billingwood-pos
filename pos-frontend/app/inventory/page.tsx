'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, AlertTriangle, Plus, X, MapPin, Minus, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth';
import { useSubscription } from '@/contexts/subscription-context';

export default function InventoryPage() {
  const { user, tenant } = useAuthStore();
  const { subscription } = useSubscription();
  const [inventory, setInventory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]); // For Starter plan
  const [simpleInventory, setSimpleInventory] = useState<any[]>([]); // For Starter plan
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'ingredients' | 'summary' | 'batches'>('ingredients');
  const [showAddStock, setShowAddStock] = useState(false);
  const [showDeductStock, setShowDeductStock] = useState(false);
  const [showPrepareDishes, setShowPrepareDishes] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [maxCapacity, setMaxCapacity] = useState<number>(0);
  const [loadingCapacity, setLoadingCapacity] = useState(false);
  const [formData, setFormData] = useState({
    ingredientId: '',
    itemId: '',
    quantity: '',
    costPrice: '',
    expiryDate: '',
    supplier: '',
  });
  const [simpleFormData, setSimpleFormData] = useState({
    ingredientId: '',
    itemId: '',
    quantity: '',
  });
  const [prepareDishesData, setPrepareDishesData] = useState({
    itemId: '',
    quantity: '',
  });

  const isStarterPlan = subscription?.currentPlan === 'STARTER' || subscription?.currentPlan === 'FREE_TRIAL';
  const isRetailOrGrocery = tenant?.businessType === 'RETAIL' || tenant?.businessType === 'GROCERY';
  const isRestaurantBusiness = tenant?.businessType === 'RESTAURANT' || tenant?.businessType === 'HOTEL' || tenant?.businessType === 'CAFE';

  useEffect(() => {
    // Only load data when user is authenticated
    if (!user) return;
    
    if (user.role === 'OWNER') {
      loadLocations();
    }
    loadInventory();
    // Load ingredients for restaurant businesses
    if (isRestaurantBusiness) {
      loadIngredients();
    }
    // Load items for Retail/Grocery OR for Professional Plan Prepare Dishes
    if (isRetailOrGrocery || !isStarterPlan) {
      loadItems();
    }
  }, [user, isStarterPlan]);

  useEffect(() => {
    // Only reload inventory when user exists and location changes
    if (user) {
      loadInventory();
    }
  }, [selectedLocation]);

  const loadLocations = async () => {
    try {
      const res = await api.locations.list();
      setLocations(res.data || []);
      // Auto-select user's location for managers
      if (user?.role !== 'OWNER' && user?.locationId) {
        setSelectedLocation(user.locationId);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      // Determine which locationId to use
      const locationId = user?.role === 'OWNER' ? selectedLocation : user?.locationId;
      
      if (isStarterPlan) {
        // Starter Plan: Load simple inventory based on business type
        if (isRetailOrGrocery) {
          // Retail/Grocery: Load items
          const itemsRes = await api.items.list();
          setSimpleInventory(itemsRes.data || []);
        } else {
          // Restaurant: Load ingredients
          const ingredientsRes = await api.ingredients.list();
          setSimpleInventory(ingredientsRes.data || []);
        }
      } else {
        // Professional Plan: Load inventory with batches based on business type
        if (isRetailOrGrocery) {
          // Retail/Grocery: Load items inventory
          const [inventoryRes, batchesRes, lowStockRes] = await Promise.all([
            api.reports.currentInventory(), // Items inventory
            api.inventory.batches(undefined, locationId),
            api.inventory.lowStock(10),
          ]);
          setSimpleInventory(inventoryRes.data.items || []); // Store items inventory
          setInventory(inventoryRes.data.items || []);
          setBatches(batchesRes.data);
          setLowStockItems(lowStockRes.data || []);
        } else {
          // Restaurant: Load ingredients inventory
          const [ingredientInventoryRes, inventoryRes, batchesRes, lowStockRes] = await Promise.all([
            api.reports.ingredientInventory(), // Load ingredient batches aggregated
            api.reports.currentInventory(),
            api.inventory.batches(undefined, locationId),
            api.inventory.lowStock(10),
          ]);
          setSimpleInventory(ingredientInventoryRes.data.ingredients || []); // Store ingredient inventory with batches
          setInventory(inventoryRes.data.items || []);
          setBatches(batchesRes.data);
          setLowStockItems(lowStockRes.data || []);
        }
      }
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await api.items.list();
      // For retail/grocery: Load all items that track inventory
      // For restaurant: Filter items that have recipes (isComposite) for Prepare Dishes
      if (isRetailOrGrocery) {
        setItems(res.data.filter((item: any) => item.trackInventory));
      } else {
        setItems(res.data.filter((item: any) => item.trackInventory && item.isComposite));
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadIngredients = async () => {
    try {
      const res = await api.ingredients.list();
      setIngredients(res.data || []);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isStarterPlan) {
      // Starter Plan: Simple quantity increment
      if (isRetailOrGrocery) {
        // For RETAIL/GROCERY: Add stock to items
        if (!simpleFormData.itemId || !simpleFormData.quantity) {
          toast.error('Please fill in all fields');
          return;
        }

        try {
          await api.items.updateQuantity(simpleFormData.itemId, Number(simpleFormData.quantity), true);
          const item = items.find((i: any) => i.id === simpleFormData.itemId);
          toast.success(`Added ${simpleFormData.quantity} ${item?.unit || 'units'} to stock`);
          setShowAddStock(false);
          setSimpleFormData({ ingredientId: '', itemId: '', quantity: '' });
          loadInventory();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to add stock');
        }
      } else {
        // For RESTAURANT: Add stock to ingredients
        if (!simpleFormData.ingredientId || !simpleFormData.quantity) {
          toast.error('Please fill in all fields');
          return;
        }

        try {
          await api.ingredients.updateQuantity(simpleFormData.ingredientId, Number(simpleFormData.quantity), true);
          const ingredient = ingredients.find((i: any) => i.id === simpleFormData.ingredientId);
          toast.success(`Added ${simpleFormData.quantity} ${ingredient?.unit || ''} to stock`);
          setShowAddStock(false);
          setSimpleFormData({ ingredientId: '', itemId: '', quantity: '' });
          loadInventory();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to add stock');
        }
      }
    } else {
      // Professional Plan: Create purchase and batch
      if (isRetailOrGrocery) {
        // For RETAIL/GROCERY: Add stock to items with batch tracking
        if (!formData.itemId || !formData.quantity || !formData.costPrice) {
          toast.error('Please fill in all required fields');
          return;
        }

        try {
          // Create a purchase to add item stock with batch tracking
          const purchaseRes = await api.purchases.create({
            items: [{
              itemId: formData.itemId,
              quantity: Number(formData.quantity),
              costPrice: Number(formData.costPrice),
            }],
            supplierName: formData.supplier || 'Direct Entry',
            notes: formData.expiryDate ? `Expiry Date: ${formData.expiryDate}` : undefined,
          });

          // Automatically receive the purchase to create inventory batches
          await api.purchases.receive(purchaseRes.data.id, {});

          const item = items.find((i: any) => i.id === formData.itemId);
          toast.success(`Added ${formData.quantity} ${item?.unit || 'units'} to stock with batch tracking`);
          setShowAddStock(false);
          setFormData({
            ingredientId: '',
            itemId: '',
            quantity: '',
            costPrice: '',
            expiryDate: '',
            supplier: '',
          });
          loadInventory();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to add stock');
        }
      } else {
        // For RESTAURANT: Add ingredient stock with batch tracking
        if (!formData.ingredientId || !formData.quantity || !formData.costPrice) {
          toast.error('Please fill in all required fields');
          return;
        }

        try {
          // Create a purchase to add ingredient stock with batch tracking
          const purchaseRes = await api.purchases.create({
            items: [{
              ingredientId: formData.ingredientId,
              quantity: Number(formData.quantity),
              costPrice: Number(formData.costPrice),
            }],
            supplierName: formData.supplier || 'Direct Entry',
            notes: formData.expiryDate ? `Expiry Date: ${formData.expiryDate}` : undefined,
          });

          // Automatically receive the purchase to create inventory batches
          await api.purchases.receive(purchaseRes.data.id, {});

          const ingredient = ingredients.find((i: any) => i.id === formData.ingredientId);
          toast.success(`Added ${formData.quantity} ${ingredient?.unit || ''} to stock with batch tracking`);
          setShowAddStock(false);
          setFormData({
            ingredientId: '',
            itemId: '',
            quantity: '',
            costPrice: '',
            expiryDate: '',
            supplier: '',
          });
          loadInventory();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to add stock');
        }
      }
    }
  };

  const handleDeductStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!simpleFormData.quantity || !selectedItem) {
      toast.error('Please enter quantity');
      return;
    }

    const quantity = Number(simpleFormData.quantity);
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > Number(selectedItem.quantity)) {
      toast.error('Cannot deduct more than available quantity');
      return;
    }

    try {
      // For Starter plan, use ingredients API
      await api.ingredients.updateQuantity(selectedItem.id, -quantity, true);
      toast.success(`Deducted ${quantity} ${selectedItem.unit || ''} from stock`);
      setShowDeductStock(false);
      setSelectedItem(null);
      setSimpleFormData({ ingredientId: '', itemId: '', quantity: '' });
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deduct stock');
    }
  };

  const checkCapacity = async (itemId: string) => {
    if (!itemId) {
      setMaxCapacity(0);
      return;
    }
    
    try {
      setLoadingCapacity(true);
      const response = await api.recipes.checkAvailability(itemId, 1);
      setMaxCapacity(response.data.maxCapacity || 0);
    } catch (error) {
      console.error('Failed to check capacity:', error);
      setMaxCapacity(0);
    } finally {
      setLoadingCapacity(false);
    }
  };

  const handlePrepareDishes = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prepareDishesData.itemId || !prepareDishesData.quantity) {
      toast.error('Please fill in all fields');
      return;
    }

    const quantity = Number(prepareDishesData.quantity);
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > maxCapacity) {
      toast.error(`Cannot prepare ${quantity} dishes. Maximum capacity is ${maxCapacity}`);
      return;
    }

    try {
      const response = await api.items.prepareDishes(prepareDishesData.itemId, quantity);
      const item = items.find((i: any) => i.id === prepareDishesData.itemId);
      toast.success(`Prepared ${quantity} ${item?.name || 'dishes'}! Ingredients deducted.`);
      setShowPrepareDishes(false);
      setPrepareDishesData({ itemId: '', quantity: '' });
      setMaxCapacity(0);
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to prepare dishes');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="h-9 w-32 bg-gray-200 animate-pulse rounded" />
            <TableSkeleton rows={10} />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              {/* Location Filter for Owners */}
              {user?.role === 'OWNER' && locations.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Locations</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Tab Toggle - Only for Professional Plan */}
              {!isStarterPlan && (
                <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-inner">
                  <button
                    onClick={() => setView('ingredients')}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === 'ingredients'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <Package className="mr-2 h-4 w-4" /> {isRetailOrGrocery ? 'Items' : 'Ingredients'}
                  </button>
                  <button
                    onClick={() => setView('batches')}
                    className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === 'batches'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    Batches
                  </button>
                </div>
              )}
              
              {/* Add Stock / Prepare Dishes Button */}
              {!isStarterPlan && isRestaurantBusiness ? (
                <Button onClick={() => setShowPrepareDishes(true)} className="bg-green-600 hover:bg-green-700">
                  <ChefHat className="mr-2 h-4 w-4" /> Prepare Dishes
                </Button>
              ) : null}
              
              <Button onClick={() => setShowAddStock(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Stock
              </Button>
            </div>
          </div>

          {/* Low Stock Warning - Professional Plan Only */}
          {!isStarterPlan && lowStockItems.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-orange-800">
                    Low Stock Alert • {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low
                  </h3>
                  <div className="mt-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.slice(0, 5).map((item: any, index: number) => {
                        const itemName = item.itemName || item.name || item.item?.name || 'Unknown Item';
                        const quantity = item.totalQuantity || item.quantity || 0;
                        const unit = item.unit || '';
                        
                        return (
                          <span 
                            key={item.id || item.itemId || `low-stock-${index}`} 
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-orange-300 shadow-sm"
                          >
                            <span className="font-semibold text-gray-900">{itemName}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                              {quantity} {unit}
                            </span>
                          </span>
                        );
                      })}
                      {lowStockItems.length > 5 && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-200 text-orange-900 font-semibold">
                          +{lowStockItems.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Starter Plan: Simple Inventory View */}
          {isStarterPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>Available Stock</CardTitle>
              </CardHeader>
              <CardContent>
                {simpleInventory.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No inventory items found</p>
                    <p className="text-gray-400 text-sm">Add stock to get started</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRetailOrGrocery ? 'Item' : 'Ingredient'}</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Available Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simpleInventory.map((ingredient: any) => {
                        const qty = Number(ingredient.quantity || 0);
                        let statusColor = 'text-green-600';
                        let statusText = 'In Stock';
                        let statusIcon = null;

                        if (qty === 0) {
                          statusColor = 'text-red-600';
                          statusText = 'Out of Stock';
                          statusIcon = <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />;
                        } else if (qty < 10) {
                          statusColor = 'text-orange-600';
                          statusText = 'Low Stock';
                          statusIcon = <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />;
                        }

                        return (
                          <TableRow key={ingredient.id}>
                            <TableCell className="font-medium text-gray-900">
                              {ingredient.name}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                                {ingredient.unit}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-lg font-semibold ${statusColor}`}>
                                {qty}
                              </span>
                              <span className="text-sm text-gray-500 ml-1">{ingredient.unit}</span>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center ${statusColor}`}>
                                {statusIcon}
                                {statusText}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedItem(ingredient);
                                    setSimpleFormData({ ingredientId: ingredient.id, itemId: '', quantity: '' });
                                    setShowDeductStock(true);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Deduct stock"
                                  disabled={qty === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Professional Plan: Ingredients + Batch-based Inventory */
            <>
              {view === 'ingredients' ? (
            <Card>
              <CardHeader>
                <CardTitle>{isRetailOrGrocery ? 'Items Inventory' : 'Raw Materials & Ingredients'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isRetailOrGrocery ? 'Item' : 'Ingredient'}</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total Stock</TableHead>
                      <TableHead>Batches</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simpleInventory.map((ingredient: any, index: number) => {
                      const qty = Number(ingredient.totalQuantity || ingredient.quantity || 0);
                      const batchCount = ingredient.batchCount || 0;
                      const totalValue = ingredient.totalValue || 0;
                      // Handle different field name structures from various endpoints
                      const itemName = ingredient.itemName || ingredient.ingredientName || ingredient.name || 'Unnamed Item';
                      const itemId = ingredient.ingredientId || ingredient.id || `item-${index}`;
                      const unit = ingredient.unit || 'PCS';
                      
                      let statusColor = 'text-green-600';
                      let statusText = 'In Stock';
                      let statusIcon = null;

                      if (qty === 0) {
                        statusColor = 'text-red-600';
                        statusText = 'Out of Stock';
                        statusIcon = <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />;
                      } else if (qty < 10) {
                        statusColor = 'text-orange-600';
                        statusText = 'Low Stock';
                        statusIcon = <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />;
                      }

                      return (
                        <TableRow key={`${itemId}-${index}`}>
                          <TableCell className="font-medium text-gray-900">
                            {itemName}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                              {unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-lg font-semibold ${statusColor}`}>
                              {qty}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">{unit}</span>
                          </TableCell>
                          <TableCell>
                            {batchCount > 0 ? (
                              <span className="text-sm text-gray-700">{batchCount} batch{batchCount > 1 ? 'es' : ''}</span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {totalValue > 0 ? formatCurrency(totalValue) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center ${statusColor}`}>
                              {statusIcon}
                              {statusText}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Ingredient Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                        <TableCell>{batch.ingredient?.name || batch.item?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {batch.currentQuantity || 0}
                            </span>
                            {batch.initialQuantity && (
                              <span className="text-sm text-gray-500">
                                of {batch.initialQuantity}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{batch.ingredient?.unit || batch.item?.unit || ''}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(batch.costPrice)}</TableCell>
                        <TableCell>{formatDate(batch.purchaseDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>

        {/* Add Stock Modal */}
        {showAddStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Add Stock</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddStock(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleAddStock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isRetailOrGrocery ? 'Item' : 'Ingredient'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={isRetailOrGrocery 
                        ? (isStarterPlan ? simpleFormData.itemId : formData.itemId)
                        : (isStarterPlan ? simpleFormData.ingredientId : formData.ingredientId)
                      }
                      onChange={(e) => {
                        if (isRetailOrGrocery) {
                          isStarterPlan
                            ? setSimpleFormData({ ...simpleFormData, itemId: e.target.value })
                            : setFormData({ ...formData, itemId: e.target.value });
                        } else {
                          isStarterPlan
                            ? setSimpleFormData({ ...simpleFormData, ingredientId: e.target.value })
                            : setFormData({ ...formData, ingredientId: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {isRetailOrGrocery ? (
                        <>
                          <option value="">Select Item</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit || 'PCS'})
                            </option>
                          ))}
                        </>
                      ) : (
                        <>
                          <option value="">Select Ingredient</option>
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={isStarterPlan ? simpleFormData.quantity : formData.quantity}
                      onChange={(e) => isStarterPlan
                        ? setSimpleFormData({ ...simpleFormData, quantity: e.target.value })
                        : setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="Enter quantity"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  {!isStarterPlan && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cost Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={formData.costPrice}
                          onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                          placeholder="Enter cost price"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Supplier (Optional)
                        </label>
                        <Input
                          type="text"
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          placeholder="Enter supplier name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date (Optional)
                        </label>
                        <Input
                          type="date"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      Add Stock
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddStock(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Deduct Stock Modal (Starter Plan Only) */}
        {showDeductStock && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Deduct Stock</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDeductStock(false);
                      setSelectedItem(null);
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Ingredient</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedItem.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Current Stock: <span className="font-semibold text-gray-900">
                      {Number(selectedItem.quantity || 0)} {selectedItem.unit}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleDeductStock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity to Deduct <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={simpleFormData.quantity}
                      onChange={(e) => setSimpleFormData({ ...simpleFormData, quantity: e.target.value })}
                      placeholder={`Enter quantity in ${selectedItem.unit}`}
                      step="0.01"
                      min="0.01"
                      max={Number(selectedItem.quantity || 0)}
                      required
                      autoFocus
                    />
                  </div>

                  {simpleFormData.quantity && Number(simpleFormData.quantity) > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">New Stock</p>
                      <p className="text-2xl font-bold text-red-700">
                        {Number(selectedItem.quantity || 0) - Number(simpleFormData.quantity)} {selectedItem.unit}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700">
                      <Minus className="h-4 w-4 mr-2" />
                      Deduct Stock
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeductStock(false);
                        setSelectedItem(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Prepare Dishes Modal (Professional Plan Only) */}
        {showPrepareDishes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ChefHat className="h-6 w-6 text-green-600" />
                    Prepare Dishes
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPrepareDishes(false);
                      setPrepareDishesData({ itemId: '', quantity: '' });
                      setMaxCapacity(0);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> Select a dish with a recipe. The system will check ingredient availability 
                    and deduct ingredients when you prepare dishes. The prepared quantity will be ready to sell.
                  </p>
                </div>

                <form onSubmit={handlePrepareDishes} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dish / Menu Item <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={prepareDishesData.itemId}
                      onChange={(e) => {
                        setPrepareDishesData({ ...prepareDishesData, itemId: e.target.value });
                        checkCapacity(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select a dish...</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    {items.length === 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        No recipe-based items found. Create recipes first.
                      </p>
                    )}
                  </div>

                  {prepareDishesData.itemId && (
                    <>
                      {loadingCapacity ? (
                        <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
                          <p className="text-sm text-gray-500">Checking ingredient availability...</p>
                        </div>
                      ) : (
                        <div className={`p-4 rounded-lg ${maxCapacity > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                          <p className="text-sm font-medium mb-1">Maximum Capacity</p>
                          <p className={`text-3xl font-bold ${maxCapacity > 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {maxCapacity} {maxCapacity === 1 ? 'dish' : 'dishes'}
                          </p>
                          {maxCapacity === 0 && (
                            <p className="text-xs text-red-600 mt-2">
                              Not enough ingredients available. Please add stock first.
                            </p>
                          )}
                        </div>
                      )}

                      {maxCapacity > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            How many dishes did you prepare? <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={prepareDishesData.quantity}
                            onChange={(e) => setPrepareDishesData({ ...prepareDishesData, quantity: e.target.value })}
                            placeholder={`Max: ${maxCapacity}`}
                            step="1"
                            min="1"
                            max={maxCapacity}
                            required
                            autoFocus
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This will deduct ingredients and add to ready dishes.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={!prepareDishesData.itemId || !prepareDishesData.quantity || maxCapacity === 0}
                    >
                      <ChefHat className="h-4 w-4 mr-2" />
                      Prepare & Deduct Ingredients
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPrepareDishes(false);
                        setPrepareDishesData({ itemId: '', quantity: '' });
                        setMaxCapacity(0);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
