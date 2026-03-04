'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CreditCard, Truck, FileText, Plus, Edit, Trash2, Check, Star, Upload, Image } from 'lucide-react';
import { api } from '@/lib/api';
import FileUpload from '@/components/file-upload';
import BankAccountModal from '@/components/bank-account-modal';
import TransportAgentModal from '@/components/transport-agent-modal';
import BrandingModal from '@/components/branding-modal';

type Tab = 'branding' | 'bank-accounts' | 'transport-agents' | 'template';

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('branding');
  const [locationId, setLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Branding State
  const [brandings, setBrandings] = useState<any[]>([]);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [editingBranding, setEditingBranding] = useState<any>(null);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);

  // Transport Agents State
  const [transportAgents, setTransportAgents] = useState<any[]>([]);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [editingTransport, setEditingTransport] = useState<any>(null);

  // Template State
  const [templateConfig, setTemplateConfig] = useState<any>({
    showLogo: true,
    showCompanyAddress: true,
    showCustomerAddress: true,
    showGST: true,
    showHSN: true,
    showSAC: true,
    showPAN: true,
    showItemCode: true,
    showItemDescription: true,
    showUnit: true,
    showDiscount: true,
    showBankDetails: true,
    showPaymentTerms: true,
    showSignature: true,
    showStamp: false,
    showQRCode: true,
    showNotes: true,
    showTermsConditions: true,
    showShippingCharge: true,
    showRoundOff: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchBrandings();
    fetchBankAccounts();
    fetchTransportAgents();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Get first location (in real app, allow user to select)
      const locationsResponse = await api.locations.list();
      const locations = locationsResponse.data;
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        setLocationId(location.id);

        // Get settings for this location
        const settingsResponse = await api.invoices.getSettings(location.id);
        const settings = settingsResponse.data;

        if (settings?.defaultTemplateConfig) {
          setTemplateConfig({ ...templateConfig, ...settings.defaultTemplateConfig });
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandings = async () => {
    try {
      const locationsResponse = await api.locations.list();
      if (locationsResponse.data && locationsResponse.data.length > 0) {
        const locationId = locationsResponse.data[0].id;
        const response = await api.brandings.list(locationId);
        setBrandings(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch brandings:', err);
    }
  };

  const fetchBankAccounts = async () => {
    console.log('[Frontend] fetchBankAccounts called');
    try {
      const locationsResponse = await api.locations.list();
      console.log('[Frontend] Locations response:', locationsResponse.data?.length, 'locations');
      if (locationsResponse.data && locationsResponse.data.length > 0) {
        const locationId = locationsResponse.data[0].id;
        console.log('[Frontend] Fetching bank accounts for location:', locationId);
        const response = await api.bankAccounts.list(locationId);
        console.log('[Frontend] Bank accounts response:', response.data?.length, 'accounts');
        setBankAccounts(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    }
  };

  const fetchTransportAgents = async () => {
    console.log('[Frontend] fetchTransportAgents called');
    try {
      const locationsResponse = await api.locations.list();
      console.log('[Frontend] Locations response:', locationsResponse.data?.length, 'locations');
      if (locationsResponse.data && locationsResponse.data.length > 0) {
        const locationId = locationsResponse.data[0].id;
        console.log('[Frontend] Fetching transport agents for location:', locationId);
        const response = await api.transportAgents.list(locationId);
        console.log('[Frontend] Transport agents response:', response.data?.length, 'agents');
        setTransportAgents(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch transport agents:', err);
    }
  };

  const handleSetDefaultBranding = async (id: string) => {
    try {
      await api.brandings.setDefault(id);
      fetchBrandings();
    } catch (err) {
      console.error('Failed to set default branding:', err);
      alert('Failed to set default branding');
    }
  };

  const handleDeleteBranding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branding?')) return;
    
    try {
      await api.brandings.delete(id);
      fetchBrandings();
    } catch (err) {
      console.error('Failed to delete branding:', err);
      alert('Failed to delete branding');
    }
  };

  const handleLogoUpload = async (brandingId: string, file: File) => {
    try {
      await api.brandings.uploadLogo(brandingId, file);
      fetchBrandings();
    } catch (err) {
      console.error('Failed to upload logo:', err);
      alert('Failed to upload logo');
    }
  };

  const handleSignatureUpload = async (brandingId: string, file: File) => {
    try {
      await api.brandings.uploadSignature(brandingId, file);
      fetchBrandings();
    } catch (err) {
      console.error('Failed to upload signature:', err);
      alert('Failed to upload signature');
    }
  };

  const handleStampUpload = async (brandingId: string, file: File) => {
    try {
      await api.brandings.uploadStamp(brandingId, file);
      fetchBrandings();
    } catch (err) {
      console.error('Failed to upload stamp:', err);
      alert('Failed to upload stamp');
    }
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      await api.bankAccounts.setDefault(id);
      fetchBankAccounts();
    } catch (err) {
      console.error('Failed to set default bank account:', err);
      alert('Failed to set default bank account');
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;
    
    try {
      await api.bankAccounts.delete(id);
      fetchBankAccounts();
    } catch (err) {
      console.error('Failed to delete bank account:', err);
      alert('Failed to delete bank account');
    }
  };

  const handleDeleteTransport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transport agent?')) return;
    
    try {
      await api.transportAgents.delete(id);
      fetchTransportAgents();
    } catch (err) {
      console.error('Failed to delete transport agent:', err);
      alert('Failed to delete transport agent');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      await api.invoices.updateSettings(locationId, {
        settings: {
          defaultTemplateConfig: templateConfig,
        },
      });
      alert('Template settings saved successfully!');
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Building2 },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'transport-agents', label: 'Transport Agents', icon: Truck },
    { id: 'template', label: 'Template', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invoice Settings</h1>
        <p className="text-gray-600 mt-1">Customize your invoice appearance and details</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold">Brandings</h2>
              <p className="text-sm text-gray-600">Manage your brand profiles for invoices</p>
            </div>
            <button
              onClick={() => {
                setEditingBranding(null);
                setShowBrandingModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Create Brand</span>
            </button>
          </div>

          {brandings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No branding profiles yet</p>
              <p className="text-sm">Create your first branding profile to customize invoices</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brandings.map((brand) => (
                <div
                  key={brand.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                      {brand.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center space-x-1">
                          <Star size={12} fill="currentColor" />
                          <span>Default</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!brand.isDefault && (
                        <button
                          onClick={() => handleSetDefaultBranding(brand.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Set as default"
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingBranding(brand);
                          setShowBrandingModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBranding(brand.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    {brand.businessName && <div className="font-medium">{brand.businessName}</div>}
                    {brand.address && <div>{brand.address}, {brand.city}, {brand.state}</div>}
                    {brand.phone && <div>📱 {brand.phone}</div>}
                    {brand.gstNumber && <div>GST: {brand.gstNumber}</div>}
                  </div>

                  {/* Images Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                    {/* Logo */}
                    <div className="text-center">
                      <label className="text-xs text-gray-500 block mb-1">Logo</label>
                      {brand.logoUrl ? (
                        <div className="relative group">
                          <img 
                            src={brand.logoUrl} 
                            alt="Logo" 
                            className="w-full h-16 object-contain border rounded"
                          />
                          <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload size={16} className="text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleLogoUpload(brand.id, file);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="w-full h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload size={16} className="text-gray-400" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(brand.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Signature */}
                    <div className="text-center">
                      <label className="text-xs text-gray-500 block mb-1">Signature</label>
                      {brand.signatureUrl ? (
                        <div className="relative group">
                          <img 
                            src={brand.signatureUrl} 
                            alt="Signature" 
                            className="w-full h-16 object-contain border rounded"
                          />
                          <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload size={16} className="text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSignatureUpload(brand.id, file);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="w-full h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload size={16} className="text-gray-400" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSignatureUpload(brand.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Stamp */}
                    <div className="text-center">
                      <label className="text-xs text-gray-500 block mb-1">Stamp</label>
                      {brand.stampUrl ? (
                        <div className="relative group">
                          <img 
                            src={brand.stampUrl} 
                            alt="Stamp" 
                            className="w-full h-16 object-contain border rounded"
                          />
                          <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload size={16} className="text-white" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleStampUpload(brand.id, file);
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="w-full h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload size={16} className="text-gray-400" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStampUpload(brand.id, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'bank-accounts' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Bank Accounts</h2>
            <button
              onClick={() => {
                setEditingBank(null);
                setShowBankModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Bank Account</span>
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No bank accounts added yet</p>
              <p className="text-sm">Add your first bank account to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
                        {account.isDefault && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center space-x-1">
                            <Star size={12} fill="currentColor" />
                            <span>Default</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{account.bankName}</p>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-500">A/C:</span> {account.accountNumber}
                        </div>
                        <div>
                          <span className="text-gray-500">IFSC:</span> {account.ifscCode}
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span> {account.accountType}
                        </div>
                      </div>
                      {account.upiId && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="text-gray-500">UPI:</span> {account.upiId}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!account.isDefault && (
                        <button
                          onClick={() => handleSetDefaultBank(account.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="Set as default"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingBank(account);
                          setShowBankModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteBank(account.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transport Agents Tab */}
      {activeTab === 'transport-agents' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Transport Agents</h2>
            <button
              onClick={() => {
                setEditingTransport(null);
                setShowTransportModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Add Transport Agent</span>
            </button>
          </div>

          {transportAgents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Truck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No transport agents added yet</p>
              <p className="text-sm">Add your first transport agent to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transportAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{agent.agentName}</h3>
                      {agent.transporterId && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="text-gray-500">Transporter ID:</span> {agent.transporterId}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        {agent.contactPerson && (
                          <div>
                            <span className="text-gray-500">Contact:</span> {agent.contactPerson}
                          </div>
                        )}
                        {agent.phone && (
                          <div>
                            <span className="text-gray-500">Phone:</span> {agent.phone}
                          </div>
                        )}
                        {agent.defaultMode && (
                          <div>
                            <span className="text-gray-500">Mode:</span> {agent.defaultMode}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingTransport(agent);
                          setShowTransportModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTransport(agent.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Tab */}
      {activeTab === 'template' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Template Configuration</h2>
          <p className="text-sm text-gray-600 mb-6">Choose which fields to display on your invoices</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(templateConfig).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, [key]: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-6 border-t mt-6">
            <button
              onClick={handleSaveTemplate}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <BrandingModal
        isOpen={showBrandingModal}
        onClose={() => {
          setShowBrandingModal(false);
          setEditingBranding(null);
        }}
        onSuccess={fetchBrandings}
        locationId={locationId}
        branding={editingBranding}
      />

      <BankAccountModal
        isOpen={showBankModal}
        onClose={() => {
          setShowBankModal(false);
          setEditingBank(null);
        }}
        onSuccess={fetchBankAccounts}
        locationId={locationId}
        account={editingBank}
      />

      <TransportAgentModal
        isOpen={showTransportModal}
        onClose={() => {
          setShowTransportModal(false);
          setEditingTransport(null);
        }}
        onSuccess={fetchTransportAgents}
        locationId={locationId}
        agent={editingTransport}
      />
    </div>
  );
}
