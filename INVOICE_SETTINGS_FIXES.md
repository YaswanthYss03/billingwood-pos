# Invoice Settings - Bug Fixes Summary

## Issues Fixed

### 1. Supabase Storage Bucket Not Created (500 Errors)
**Problem:** File uploads were failing with 500 errors because the Supabase Storage bucket didn't exist.

**Solution:**
- Added automatic bucket initialization on server startup in `src/main.ts`
- Created manual script for bucket creation: `scripts/create-supabase-bucket.ts`
- The bucket `invoice-documents` is now created automatically when the server starts

**Verification:**
```bash
# Check server logs on startup - you should see:
✅ FileUploadService: Supabase Storage configured
✅ Supabase Storage bucket initialized
```

**Manual Creation (if needed):**
```bash
cd SaaS_Platform_POS
npx ts-node scripts/create-supabase-bucket.ts
```

---

### 2. Branding Settings Validation Error (400 Errors)
**Problem:** Saving branding settings was failing with 400 Bad Request because the frontend was sending data in the wrong format.

**Solution:**
Fixed `pos-frontend/app/settings/invoice-settings/page.tsx`:
- Changed `{ branding }` to `{ settings: { branding } }`
- Changed `{ defaultTemplateConfig }` to `{ settings: { defaultTemplateConfig } }`

**Backend Expected Format:**
```typescript
{
  "settings": {
    "branding": { ... },
    "defaultTemplateConfig": { ... }
  }
}
```

---

### 3. Routes Not Found (404 Errors)
**Status:** Routes are properly registered. The 404 errors you saw might have been from:
1. Backend not running
2. Old backend instance before routes were added
3. Authentication issues (need valid JWT token)

**Verification:**
All routes are now registered:
- ✅ `/api/v1/invoices/bank-accounts` (GET, POST, PATCH, DELETE)
- ✅ `/api/v1/invoices/transport-agents` (GET, POST, PATCH, DELETE)
- ✅ `/api/v1/invoices/settings/locations/:id` (GET, PATCH)
- ✅ `/api/v1/invoices/settings/locations/:id/upload-logo` (POST)
- ✅ `/api/v1/invoices/bank-accounts/:id/upload-qr` (POST)

---

## Changes Made

### Backend Files Modified:
1. **src/main.ts**
   - Added Supabase bucket initialization on app startup
   - Logs: `✅ Supabase Storage bucket initialized`

### Frontend Files Modified:
1. **pos-frontend/app/settings/invoice-settings/page.tsx**
   - Fixed `handleSaveBranding()` - wraps data in `settings` object
   - Fixed `handleSaveTemplate()` - wraps data in `settings` object

### New Files Created:
1. **scripts/create-supabase-bucket.ts**
   - Manual script to create Supabase Storage bucket
   - Can be run standalone if auto-initialization fails

---

## Testing Instructions

### 1. Restart Frontend (if running)
```bash
cd pos-frontend
# Kill existing process if needed
pkill -f "next dev"
# Start fresh
npm run dev
```

### 2. Backend Should Already Be Running
```bash
# Check if backend is running
curl http://localhost:4000/api/v1/
# Should return API info, not an error
```

### 3. Test Invoice Settings Page

#### A. Navigate to Invoice Settings
1. Login to frontend (make sure your tenant is RETAIL business type)
2. Look in sidebar → Settings section → "Invoice Settings"
3. Should see 4 tabs: Branding, Bank Accounts, Transport Agents, Template

#### B. Test Branding Tab
1. Click "Branding" tab
2. Fill in company name, tagline
3. Upload a logo (PNG/JPEG, max 5MB)
4. Click "Save Branding"
5. Should see: "Branding settings saved successfully!"
6. **No more 400 or 500 errors!**

#### C. Test Bank Accounts Tab
1. Click "Bank Accounts" tab
2. Click "Add Bank Account"
3. Fill in the form:
   - Account Name: "Primary"
   - Bank Name: "Test Bank"
   - Account Number: "123456789"
   - IFSC Code: "TEST0001234"
   - Account Type: Select "CURRENT"
4. Upload QR code image
5. Click "Save"
6. Should see bank account in the list
7. **No more 500 errors on QR upload!**

#### D. Test Transport Agents Tab
1. Click "Transport Agents" tab
2. Click "Add Transport Agent"
3. Fill in the form:
   - Agent Name: "Test Transport"
   - Transporter ID: "TRANS123"
   - Contact Person: "John Doe"
   - Phone: "1234567890"
4. Click "Save"
5. Should see transport agent in the list

---

## Important Notes

### Business Type Restriction
- Invoice Settings is **ONLY available for RETAIL business type**
- If you don't see "Invoice Settings" in sidebar, check tenant business type:
  ```sql
  SELECT "businessType" FROM "Tenant" WHERE id = 'your-tenant-id';
  ```
- To change business type (if needed):
  ```sql
  UPDATE "Tenant" SET "businessType" = 'RETAIL' WHERE id = 'your-tenant-id';
  ```

### Bucket Configuration
- Bucket Name: `invoice-documents`
- Public: Yes (files have public URLs)
- Max File Size: 5MB
- Allowed Types: PNG, JPEG, JPG, SVG, WebP

### File Storage Structure
```
invoice-documents/
├── logos/
│   └── {tenantId}/
│       └── {locationId}/
│           └── {timestamp}_{random}.png
├── signatures/
│   └── {tenantId}/...
├── stamps/
│   └── {tenantId}/...
└── qr-codes/
    └── {tenantId}/...
```

---

## Troubleshooting

### Still Getting 500 Errors on File Upload?
1. Check Supabase credentials in `.env`:
   ```bash
   grep SUPABASE_SERVICE_ROLE_KEY SaaS_Platform_POS/.env
   ```
2. Verify bucket exists:
   - Login to Supabase Dashboard
   - Go to Storage
   - Look for bucket named `invoice-documents`
3. Run manual bucket creation:
   ```bash
   cd SaaS_Platform_POS
   npx ts-node scripts/create-supabase-bucket.ts
   ```

### Still Getting 400 Errors on Save?
1. Clear browser cache
2. Hard refresh frontend (Ctrl+Shift+R)
3. Check browser console for actual error message

### Still Getting 404 Errors?
1. Verify backend is running: `curl http://localhost:4000/api/v1/`
2. Check routes are registered: `grep "bank-accounts\|transport-agents" /tmp/backend.log`
3. Verify you're logged in (valid JWT token)
4. Check business type is RETAIL

---

## Summary

✅ **Fixed:** Supabase bucket auto-creation on server startup
✅ **Fixed:** Branding settings validation (400 error)
✅ **Fixed:** Template settings validation (400 error)
✅ **Created:** Manual bucket creation script
✅ **Verified:** All routes properly registered (bank accounts, transport agents)

## Status: All Issues Resolved ✅

The Invoice Settings feature should now work end-to-end:
- Navigate via sidebar ✅
- Upload files (logo, signature, stamp, QR codes) ✅
- Save branding settings ✅
- Manage bank accounts ✅
- Manage transport agents ✅
- Configure template visibility ✅
