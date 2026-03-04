'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface TemplateConfig {
  showLogo: boolean;
  showCompanyDetails: boolean;
  showGST: boolean;
  showHSN: boolean;
  showDiscount: boolean;
  showShipping: boolean;
  showBankDetails: boolean;
  showQRCode: boolean;
  showSignature: boolean;
  showNotes: boolean;
  showTermsAndConditions: boolean;
  showThankYouMessage: boolean;
  showAmountInWords: boolean;
  showItemDescription: boolean;
  showTaxBreakdown: boolean;
  showPaymentTerms: boolean;
  showDueDate: boolean;
  showCustomerGSTIN: boolean;
  showItemHSN: boolean;
  showItemSKU: boolean;
}

interface LocationSettings {
  enabled: boolean;
  defaultTemplateConfig: TemplateConfig;
  branding: {
    logoUrl: string;
    companyName: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website: string;
    gstNumber: string;
    panNumber: string;
    primaryColor: string;
    accentColor: string;
    signatureUrl: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    upiId: string;
    qrCodeUrl: string;
  };
  numbering: {
    prefix: string;
    sequenceLength: number;
    resetFrequency: string;
  };
  textDefaults: {
    paymentTerms: string;
    notes: string;
    termsAndConditions: string;
    thankYouMessage: string;
  };
}

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);

  const templates = [
    { id: 1, name: 'Classic', description: 'Traditional invoice layout' },
    { id: 2, name: 'Modern', description: 'Clean and spacious design' },
    { id: 3, name: 'Minimal', description: 'Bare essentials only' },
    { id: 4, name: 'Professional', description: 'Corporate style' },
    { id: 5, name: 'Colorful', description: 'Vibrant design' },
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchSettings();
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const response = await api.locations.list();
      if (response.data?.data) {
        setLocations(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedLocation(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.invoices.getSettings(selectedLocation);
      if (response.data) {
        setSettings(response.data.settings);
        setHasOverrides(response.data.metadata?.hasLocationOverrides || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await api.invoices.updateSettings(selectedLocation, { settings });
      alert('Settings saved successfully!');
      fetchSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset to tenant defaults?')) return;

    try {
      // Note: Using updateSettings with empty settings object to reset
      await api.invoices.updateSettings(selectedLocation, { settings: null });
      alert('Settings reset to defaults!');
      fetchSettings();
    } catch (error) {
      console.error('Failed to reset settings:', error);
      alert('Failed to reset settings');
    }
  };

  const updateTemplateConfig = (field: keyof TemplateConfig, value: boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      defaultTemplateConfig: {
        ...settings.defaultTemplateConfig,
        [field]: value,
      },
    });
  };

  const updateBranding = (field: string, value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      branding: {
        ...settings.branding,
        [field]: value,
      },
    });
  };

  const updateBankDetails = (field: string, value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      bankDetails: {
        ...settings.bankDetails,
        [field]: value,
      },
    });
  };

  const updateTextDefaults = (field: string, value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      textDefaults: {
        ...settings.textDefaults,
        [field]: value,
      },
    });
  };

  if (loading || !settings) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Settings</h1>
          <p className="text-gray-600 mt-1">Configure invoice templates and settings per location</p>
        </div>

        {/* Location Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Location
              </label>
              <select
                className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              {hasOverrides && (
                <p className="text-sm text-blue-600 mt-1">
                  ✓ This location has custom settings
                </p>
              )}
            </div>
            {hasOverrides && (
              <button
                onClick={handleResetToDefaults}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset to Tenant Defaults
              </button>
            )}
          </div>
        </div>

        {/* Template Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Template Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="aspect-square bg-gray-100 rounded mb-3 flex items-center justify-center">
                  <span className="text-4xl">📄</span>
                </div>
                <h3 className="font-semibold text-center">{template.name}</h3>
                <p className="text-xs text-gray-600 text-center mt-1">{template.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Template Customization */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Template Customization</h2>
          <p className="text-sm text-gray-600 mb-6">
            Toggle fields to show/hide in your invoice template
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(settings.defaultTemplateConfig).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateTemplateConfig(key as keyof TemplateConfig, e.target.checked)}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.branding.companyName}
                onChange={(e) => updateBranding('companyName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.branding.gstNumber}
                onChange={(e) => updateBranding('gstNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.branding.phone}
                onChange={(e) => updateBranding('phone', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.branding.email}
                onChange={(e) => updateBranding('email', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.branding.address}
                onChange={(e) => updateBranding('address', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 rounded-lg"
                value={settings.branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <input
                type="color"
                className="w-full h-10 border border-gray-300 rounded-lg"
                value={settings.branding.accentColor}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bank Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.bankDetails.bankName}
                onChange={(e) => updateBankDetails('bankName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.bankDetails.accountNumber}
                onChange={(e) => updateBankDetails('accountNumber', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.bankDetails.ifscCode}
                onChange={(e) => updateBankDetails('ifscCode', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.bankDetails.upiId}
                onChange={(e) => updateBankDetails('upiId', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Text Defaults */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Text Defaults</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.textDefaults.paymentTerms}
                onChange={(e) => updateTextDefaults('paymentTerms', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.textDefaults.notes}
                onChange={(e) => updateTextDefaults('notes', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.textDefaults.termsAndConditions}
                onChange={(e) => updateTextDefaults('termsAndConditions', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thank You Message
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={settings.textDefaults.thankYouMessage}
                onChange={(e) => updateTextDefaults('thankYouMessage', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
