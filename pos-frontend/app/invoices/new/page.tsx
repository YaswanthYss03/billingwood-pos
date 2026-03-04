'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import HsnSacAutocomplete from '@/components/hsn-sac-autocomplete';

interface InvoiceItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  price: number;
  gstRate: number;
  discount: number;
  hsnCode?: string;
  sacCode?: string;
  description?: string;
  isService?: boolean; // Toggle for HSN/SAC
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transportAgents, setTransportAgents] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showTransportDetails, setShowTransportDetails] = useState(false);
  const [formData, setFormData] = useState({
    locationId: '',
    customerId: '',
    bankAccountId: '',
    transportAgentId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    placeOfSupply: '',
    challanNumber: '',
    challanDate: '',
    ewayBillNumber: '',
    ewayBillDate: '',
    vehicleNumber: '',
    lrNumber: '',
    notes: '',
    termsConditions: '',
    markAsSent: false,
  });

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (formData.locationId) {
      fetchBankAccounts(formData.locationId);
      fetchTransportAgents(formData.locationId);
    }
  }, [formData.locationId]);

  // Calculate due date based on payment terms
  useEffect(() => {
    const calculateDueDate = () => {
      const invoiceDate = new Date(formData.invoiceDate);
      let daysToAdd = 30; // Default

      // Extract days from payment terms (e.g., "Net 30" -> 30, "Net 7" -> 7)
      const match = formData.paymentTerms.match(/(\d+)/);
      if (match) {
        daysToAdd = parseInt(match[1]);
      }

      const dueDate = new Date(invoiceDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const dueDateString = dueDate.toISOString().split('T')[0];

      if (dueDateString !== formData.dueDate) {
        setFormData(prev => ({ ...prev, dueDate: dueDateString }));
      }
    };

    calculateDueDate();
  }, [formData.paymentTerms, formData.invoiceDate]);

  const fetchCustomers = async () => {
    try {
      const response = await api.customers.list();
      console.log('Customers API response:', response.data);
      if (response.data) {
        setCustomers(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.items.list();
      console.log('Items API response:', response.data);
      if (response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.locations.list();
      console.log('Locations API response:', response.data);
      if (response.data && Array.isArray(response.data)) {
        setLocations(response.data);
        // Set first location as default
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, locationId: response.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      // If locations API fails (Starter plan), leave locationId empty
    }
  };

  const fetchBankAccounts = async (locationId: string) => {
    try {
      const response = await api.bankAccounts.list(locationId);
      if (response.data) {
        setBankAccounts(Array.isArray(response.data) ? response.data : []);
        // Auto-select default bank account
        const defaultBank = response.data.find((b: any) => b.isDefault);
        if (defaultBank) {
          setFormData(prev => ({ ...prev, bankAccountId: defaultBank.id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  const fetchTransportAgents = async (locationId: string) => {
    try {
      const response = await api.transportAgents.list(locationId);
      if (response.data) {
        setTransportAgents(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch transport agents:', error);
    }
  };

  const addItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        itemId: '',
        itemName: '',
        quantity: 1,
        unit: 'PCS',
        price: 0,
        gstRate: 0,
        discount: 0,
        isService: false,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };

    // If item selected, auto-fill details
    if (field === 'itemId' && value) {
      const item = items.find(i => i.id === value);
      console.log('Item selected:', value, 'Found item:', item);
      if (item) {
        // Check stock availability
        const availableQty = item.quantity || 0;
        if (item.trackInventory && availableQty <= 0) {
          toast.error(`${item.name} is out of stock!`);
          return; // Don't add the item
        }

        updated[index].itemName = item.name;
        updated[index].price = item.sellingPrice || item.price || 0;
        updated[index].unit = item.unit || 'PCS';
        updated[index].gstRate = item.gstRate || 0;
        updated[index].hsnCode = item.hsnCode || '';
        updated[index].sacCode = item.sacCode || '';

        // Show warning if stock is low
        if (item.trackInventory && availableQty < 5) {
          toast(`⚠️ Low stock alert: Only ${availableQty} ${item.unit} available`, {
            duration: 4000,
            icon: '⚠️',
          });
        }
      }
    }

    // Validate quantity against available stock
    if (field === 'quantity' && updated[index].itemId) {
      const item = items.find(i => i.id === updated[index].itemId);
      if (item && item.trackInventory) {
        const availableQty = item.quantity || 0;
        if (value > availableQty) {
          toast.error(`Cannot add ${value} ${item.unit}. Only ${availableQty} available in stock.`);
          updated[index].quantity = availableQty;
        }
      }
    }

    setInvoiceItems(updated);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;
    let totalDiscount = 0;

    invoiceItems.forEach(item => {
      const itemSubtotal = item.quantity * item.price;
      const itemDiscount = item.discount || 0;
      const afterDiscount = itemSubtotal - itemDiscount;
      const gstAmount = (afterDiscount * item.gstRate) / 100;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalGst += gstAmount;
    });

    const totalAmount = subtotal - totalDiscount + totalGst;

    return { subtotal, totalGst, totalDiscount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const totals = calculateTotals();
      
      const payload = {
        customerId: selectedCustomer.id,
        locationId: formData.locationId || undefined,
        bankAccountId: formData.bankAccountId || undefined,
        transportAgentId: formData.transportAgentId || undefined,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        placeOfSupply: formData.placeOfSupply || undefined,
        challanNumber: formData.challanNumber || undefined,
        challanDate: formData.challanDate || undefined,
        ewayBillNumber: formData.ewayBillNumber || undefined,
        ewayBillDate: formData.ewayBillDate || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        lrNumber: formData.lrNumber || undefined,
        customerSnapshot: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email || undefined,
          address: selectedCustomer.address || undefined,
          city: selectedCustomer.city || undefined,
          state: selectedCustomer.state || undefined,
          pincode: selectedCustomer.pincode || undefined,
          gstin: selectedCustomer.gstNumber || undefined,
        },
        items: invoiceItems.map(item => {
          const itemSubtotal = item.quantity * item.price;
          const itemDiscount = item.discount || 0;
          const afterDiscount = itemSubtotal - itemDiscount;
          const gstAmount = (afterDiscount * item.gstRate) / 100;
          const totalAmount = afterDiscount + gstAmount;
          
          return {
            itemId: item.itemId || undefined,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            gstRate: item.gstRate,
            gstAmount: gstAmount,
            discount: itemDiscount,
            totalAmount: totalAmount,
            hsnCode: item.hsnCode || undefined,
            sacCode: item.sacCode || undefined,
            description: item.description || undefined,
          };
        }),
        subtotal: totals.subtotal,
        taxAmount: totals.totalGst,
        discount: totals.totalDiscount,
        totalAmount: totals.totalAmount,
        templateId: 'template-1',
        notes: formData.notes || undefined,
        termsConditions: formData.termsConditions || undefined,
        markAsSent: formData.markAsSent,
      };

      console.log('Sending invoice payload:', payload);
      const response = await api.invoices.create(payload);

      // Note: api.ts response interceptor unwraps { success, data } to just data
      // So if response.data exists and has an id, the invoice was created successfully
      if (response.data && response.data.id) {
        toast.success('Invoice created successfully!');
        router.push(`/invoices/${response.data.id}`);
      } else {
        console.error('Unexpected response format:', response);
        toast.error('Failed to create invoice');
      }
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to create invoice';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Invoice</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                    setFormData(prev => ({ ...prev, customerId: e.target.value }));
                  }}
                >
                  <option value="">Choose a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                  )}
                  {selectedCustomer.address && (
                    <p className="text-sm text-gray-600">{selectedCustomer.address}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.locationId}
                    onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                  >
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 60">Net 60</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place of Supply
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.placeOfSupply}
                  onChange={(e) => setFormData(prev => ({ ...prev, placeOfSupply: e.target.value }))}
                  placeholder="e.g., Kerala (32)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account {bankAccounts.length === 0 && '(Configure in Invoice Settings)'}
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccountId: e.target.value }))}
                  disabled={bankAccounts.length === 0}
                >
                  <option value="">{bankAccounts.length === 0 ? 'No bank accounts configured' : 'Select bank account'}</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} - {account.bankName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Agent {transportAgents.length === 0 && '(Configure in Invoice Settings)'}
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.transportAgentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportAgentId: e.target.value }))}
                  disabled={transportAgents.length === 0}
                >
                  <option value="">{transportAgents.length === 0 ? 'No transport agents configured' : 'Select transport agent (optional)'}</option>
                  {transportAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.agentName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Transport Details (Collapsible) */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              type="button"
              onClick={() => setShowTransportDetails(!showTransportDetails)}
              className="flex items-center justify-between w-full text-xl font-semibold mb-4"
            >
              <span>Transport Details (Optional)</span>
              {showTransportDetails ? <ChevronUp /> : <ChevronDown />}
            </button>

            {showTransportDetails && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challan Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.challanNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, challanNumber: e.target.value }))}
                    placeholder="33"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challan Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.challanDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, challanDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Way Bill Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.ewayBillNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, ewayBillNumber: e.target.value }))}
                    placeholder="784463478"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Way Bill Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.ewayBillDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, ewayBillDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                    placeholder="GJ01AB1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LR Number (Lorry Receipt)
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.lrNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, lrNumber: e.target.value }))}
                    placeholder="24AB8SF03218ZZL"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN/SAC</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST%</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, index) => {
                    const itemTotal = (item.quantity * item.price - (item.discount || 0)) * (1 + item.gstRate / 100);
                    return (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <select
                            className="w-full border border-gray-300 rounded px-2 py-1 mb-1"
                            value={item.itemId}
                            onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                          >
                            <option value="">Custom Item</option>
                            {items.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                          </select>
                          {!item.itemId && (
                            <input
                              type="text"
                              placeholder="Item name"
                              className="w-full border border-gray-300 rounded px-2 py-1"
                              value={item.itemName}
                              onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="space-y-1">
                            <label className="flex items-center space-x-1 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={item.isService || false}
                                onChange={(e) => updateItem(index, 'isService', e.target.checked)}
                                className="h-3 w-3"
                              />
                              <span>Service</span>
                            </label>
                            <HsnSacAutocomplete
                              value={item.isService ? (item.sacCode || '') : (item.hsnCode || '')}
                              onChange={(code, gstRate) => {
                                if (item.isService) {
                                  updateItem(index, 'sacCode', code);
                                } else {
                                  updateItem(index, 'hsnCode', code);
                                }
                                if (gstRate !== undefined) {
                                  updateItem(index, 'gstRate', gstRate);
                                }
                              }}
                              type={item.isService ? 'SAC' : 'HSN'}
                              placeholder={item.isService ? 'SAC code' : 'HSN code'}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="w-20 border border-gray-300 rounded px-2 py-1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            className="w-16 border border-gray-300 rounded px-2 py-1"
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-24 border border-gray-300 rounded px-2 py-1"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-16 border border-gray-300 rounded px-2 py-1"
                            value={item.gstRate}
                            onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-20 border border-gray-300 rounded px-2 py-1"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>₹{totals.totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.markAsSent}
                    onChange={(e) => setFormData(prev => ({ ...prev, markAsSent: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Mark as sent immediately (will deduct inventory)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
