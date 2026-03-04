# Invoice Template & Settings Improvements

## Summary of Changes

Fixed multiple issues with invoice creation and PDF generation to improve user experience and ensure branding is properly displayed in generated invoices.

---

## Issues Fixed

### 1. ✅ Removed Template Dropdown from Invoice Creation
**Problem:** Users were required to select a template when creating invoices, but you want only one template that changes based on invoice settings.

**Solution:**
- Removed template dropdown from invoice creation form ([app/invoices/new/page.tsx](pos-frontend/app/invoices/new/page.tsx))
- Hardcoded `templateId: 'template-1'` for all new invoices
- Template layout now changes automatically based on Invoice Settings (branding, bank details, etc.)

**Files Changed:**
- `pos-frontend/app/invoices/new/page.tsx`
  - Removed `templateId` from form state
  - Removed template dropdown UI (lines 424-436)
  - Set `templateId: 'template-1'` in invoice creation payload

---

### 2. ✅ Bank Accounts & Transport Agents Always Visible
**Problem:** Bank accounts and transport agents dropdowns were hidden if no records existed, making it unclear why they weren't showing.

**Solution:**
- Always show bank account and transport agent dropdowns
- Display helpful message when none configured: "(Configure in Invoice Settings)"
- Disable dropdown when empty with clear message
- Auto-select default bank account if available

**Files Changed:**
- `pos-frontend/app/invoices/new/page.tsx`
  - Removed conditional rendering (`bankAccounts.length > 0`)
  - Changed to always render with disabled state when empty
  - Added helpful labels showing configuration needed

**Result:**
- Users can now see these fields exist
- Clear guidance on where to configure them
- Better UX for initial setup

---

### 3. ✅ PDF Template Shows Branding (Logo, Signature, Stamp)
**Problem:** Uploaded logo, signature, and stamp were saved to Supabase but not appearing in generated PDF invoices.

**Solution:**
- Changed PDF template to show branding based on **data availability** instead of config flags
- Logo displays if `branding.logoUrl` exists (removed dependency on `config.showLogo`)
- Bank details display if `invoice.bankAccount` exists
- QR code displays if `invoice.bankAccount.qrCodeUrl` exists
- Signature and stamp display if `branding.signatureUrl` or `branding.stampUrl` exist
- Removed hardcoded "LOGOTEXT" placeholder

**Files Changed:**
- `SaaS_Platform_POS/src/invoices/services/invoice-pdf.service.ts`
  - Line 282-286: Logo now shows based on `branding.logoUrl` only
  - Line 390-400: Bank details show based on `invoice.bankAccount` existence
  - Line 410-418: QR code shows based on `qrCodeUrl` existence
  - Line 437-447: Signature section always renders, includes stamp if available

**Before:**
```typescript
${config.showLogo && branding.logoUrl ? `
  <img src="${branding.logoUrl}" alt="Logo" />
  <div>LOGOTEXT</div>
` : ''}
```

**After:**
```typescript
${branding.logoUrl ? `
  <img src="${branding.logoUrl}" alt="Logo" />
` : ''}
```

---

## Technical Details

### Invoice Creation Flow

```
1. User navigates to Create Invoice page
2. Form loads with:
   - Bank Accounts dropdown (auto-selects default)
   - Transport Agents dropdown (optional)
   - NO template dropdown
3. User fills invoice details
4. On submit:
   - templateId automatically set to 'template-1'
   - All branding comes from Invoice Settings
```

### PDF Generation Flow

```
1. Invoice created with templateId = 'template-1'
2. PDF generation triggered
3. Settings resolved for location:
   - Layer 1: System defaults
   - Layer 2: Tenant defaults
   - Layer 3: Location overrides (from Invoice Settings)
4. Branding data includes:
   - logoUrl (from Supabase Storage)
   - signatureUrl (from Supabase Storage)
   - stampUrl (from Supabase Storage)
   - businessName, address, GST, etc.
5. Bank account data from selected account:
   - qrCodeUrl (from Supabase Storage)
   - account details
6. HTML template renders with:
   - Logo (top right) if logoUrl exists
   - Bank details if bank account selected
   - QR code if qrCodeUrl exists
   - Signature/stamp at bottom if available
7. Puppeteer converts HTML to PDF
```

### Data Storage Structure

**Supabase Storage Bucket:** `invoice-documents` (public)

```
invoice-documents/
├── logos/
│   └── {tenantId}/
│       └── {locationId}/
│           └── {timestamp}_{random}.png
├── signatures/
│   └── {tenantId}/
│       └── {locationId}/
│           └── {timestamp}_{random}.png
├── stamps/
│   └── {tenantId}/
│       └── {locationId}/
│           └── {timestamp}_{random}.png
└── qr-codes/
    └── {tenantId}/
        └── {locationId}/
            └── {timestamp}_{random}.png
```

**Location Settings (in database):**
```json
{
  "invoiceSettings": {
    "branding": {
      "businessName": "Your Company",
      "logoUrl": "https://...supabase.co/storage/.../logo.png",
      "signatureUrl": "https://...supabase.co/storage/.../signature.png",
      "stampUrl": "https://...supabase.co/storage/.../stamp.png",
      "companyTagline": "Your tagline",
      "address": "...",
      "gstNumber": "..."
    }
  }
}
```

---

## Testing Guide

### Test 1: Create Invoice with Branding
1. Go to **Settings** → **Invoice Settings**
2. **Branding Tab:**
   - Upload a logo (PNG/JPEG)
   - Add company name and tagline
   - Click "Save Branding"
3. **Bank Accounts Tab:**
   - Add a bank account
   - Upload QR code for payment
   - Set as default
4. Go to **Invoices** → **Create Invoice**
5. Fill invoice details:
   - Select customer
   - Select bank account (should auto-select if default set)
   - Add items
6. Submit invoice
7. Download PDF
8. **Verify PDF contains:**
   - ✅ Company logo (top right)
   - ✅ Company name and tagline
   - ✅ Bank details
   - ✅ QR code for payment
   - ✅ Signature/stamp (if uploaded)

### Test 2: Bank Account Shows Even When Empty
1. If you haven't configured bank accounts:
2. Go to **Invoices** → **Create Invoice**
3. **Verify:**
   - ✅ "Bank Account" field is visible
   - ✅ Shows message: "(Configure in Invoice Settings)"
   - ✅ Dropdown is disabled and shows "No bank accounts configured"
4. Go configure bank accounts
5. Return to Create Invoice
6. **Verify:**
   - ✅ Dropdown is enabled
   - ✅ Shows configured accounts
   - ✅ Auto-selects default if set

### Test 3: Transport Agent Shows Even When Empty
1. If you haven't configured transport agents:
2. Go to **Invoices** → **Create Invoice**
3. **Verify:**
   - ✅ "Transport Agent" field is visible
   - ✅ Shows message: "(Configure in Invoice Settings)"
   - ✅ Dropdown is disabled
4. Configure transport agents
5. Return and verify dropdown works

### Test 4: No Template Selection Required
1. Go to **Invoices** → **Create Invoice**
2. **Verify:**
   - ✅ NO "Template" dropdown visible
   - ✅ Form is cleaner without template selection
3. Create invoice and download PDF
4. **Verify:**
   - ✅ PDF uses standard template layout
   - ✅ Layout matches your branding settings

---

## Migration Notes

### For Existing Invoices
- Existing invoices with different `templateId` values will continue to work
- New invoices always use `template-1`
- Template layout is consistent across all invoices
- Branding changes in Invoice Settings affect ALL invoices (past and future PDFs)

### For Users
- **No action required** - changes are automatic
- Upload your branding assets in Invoice Settings
- Configure bank accounts and transport agents
- All new invoices will include your branding

---

## Configuration Checklist

To get full functionality, configure these in **Invoice Settings**:

### Branding Tab
- [ ] Upload company logo
- [ ] Add business name
- [ ] Add company tagline
- [ ] Fill company address, GST number, etc.
- [ ] Upload signature image (optional)
- [ ] Upload company stamp (optional)

### Bank Accounts Tab
- [ ] Add at least one bank account
- [ ] Upload QR code for UPI payment
- [ ] Set default bank account

### Transport Agents Tab
- [ ] Add transport agents you work with (optional)
- [ ] Include transporter ID and contact details

### Template Tab
- [ ] Configure which fields to show/hide
- [ ] Toggle visibility of bank details, QR code, etc.

---

## Troubleshooting

### Logo/Signature/Stamp Not Showing in PDF?

1. **Check file was uploaded successfully:**
   - In Supabase Dashboard → Storage → `invoice-documents`
   - Files should be in correct folders (logos/, signatures/, stamps/)

2. **Check URL is public:**
   - Logo/signature/stamp URLs should be accessible
   - Try opening URL in browser - should display image

3. **Check Invoice Settings saved:**
   - Go to Invoice Settings → Branding tab
   - Verify logo shows in preview
   - Re-save branding if needed

4. **Check location is correct:**
   - Invoice must be created for the location where settings were configured
   - Settings are per-location

### Bank Account Not Showing in Dropdown?

1. **Check business type:**
   - Bank accounts only available for RETAIL business type
   - Check: `SELECT "businessType" FROM "Tenant"`

2. **Check bank account created:**
   - In Prisma Studio or Database
   - Should have correct `locationId` and `tenantId`

3. **Check API response:**
   - Open browser console
   - Look for: `Failed to fetch bank accounts`
   - Check backend logs for errors

### QR Code Not in PDF?

1. **Verify QR uploaded:**
   - Bank Accounts tab → Select account → Should show QR preview
   - Check `qrCodeUrl` in database

2. **Verify bank account selected:**
   - When creating invoice, must select a bank account
   - QR only shows if bank account is associated with invoice

---

## API Endpoints Reference

### Bank Accounts
- `GET /api/v1/invoices/bank-accounts?locationId={id}` - List all
- `POST /api/v1/invoices/bank-accounts` - Create new
- `POST /api/v1/invoices/bank-accounts/{id}/upload-qr` - Upload QR code
- `PATCH /api/v1/invoices/bank-accounts/{id}/set-default` - Set as default

### Transport Agents
- `GET /api/v1/invoices/transport-agents?locationId={id}` - List all
- `POST /api/v1/invoices/transport-agents` - Create new
- `PATCH /api/v1/invoices/transport-agents/{id}` - Update
- `DELETE /api/v1/invoices/transport-agents/{id}` - Delete

### Invoice Settings
- `GET /api/v1/invoices/settings/locations/{locationId}` - Get settings
- `PATCH /api/v1/invoices/settings/locations/{locationId}` - Update settings
- `POST /api/v1/invoices/settings/locations/{locationId}/upload-logo` - Upload logo
- `POST /api/v1/invoices/settings/locations/{locationId}/upload-signature` - Upload signature
- `POST /api/v1/invoices/settings/locations/{locationId}/upload-stamp` - Upload stamp

---

## Summary

✅ **Template dropdown removed** - Single template changes based on settings
✅ **Bank accounts always visible** - Clear guidance when empty
✅ **Transport agents always visible** - Better UX for setup
✅ **Logo displays in PDF** - Branding from Invoice Settings
✅ **Signature displays in PDF** - Shows if uploaded
✅ **Stamp displays in PDF** - Shows if uploaded
✅ **QR code displays in PDF** - Payment QR from bank account
✅ **Bank details in PDF** - Shows selected bank account info

**Result:** Professional, branded invoices with your company's logo, bank details, and payment QR code automatically included in every PDF!
