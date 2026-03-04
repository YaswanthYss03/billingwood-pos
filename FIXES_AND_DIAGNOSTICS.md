# POS Platform - Fixes and Diagnostics

## Summary of Changes Made

### ✅ 1. Added Missing Business Information Fields to Branding Form

**File Modified:** `pos-frontend/app/settings/invoice-settings/page.tsx`

**Changes:**
- Added comprehensive business information section with the following fields:
  - Business Name (required)
  - Website
  - Address (required)
  - City (required)
  - State (required)
  - Pincode (required)
  - Phone (required)
  - Email (required)
  - GST Number (optional, auto-converts to uppercase)
  - PAN Number (optional, auto-converts to uppercase)

- Organized the form into logical sections:
  - **Company Logo & Tagline** - at the top
  - **Business Information** - contact and address details
  - **Brand Colors** - primary and accent colors
  - **Signature & Stamp** - for invoice footer

**Result:** Users can now view and edit all branding/business details from the Invoice Settings page.

---

### ✅ 2. Invoice Creation Form Already Has Bank Account & Transport Agent Selection

**File:** `pos-frontend/app/invoices/new/page.tsx`

**Status:** The form already includes:
- Bank Account dropdown (lines 436-451)
- Transport Agent dropdown (lines 455-471)
- Auto-selects the default bank account when available
- Shows helpful messages when no accounts are configured

**Issue:** The dropdowns are showing empty because the API calls to fetch bank accounts and transport agents are returning 404 errors.

---

### ✅ 3. Invoice PDF Generation Already Includes Logo

**Files Checked:**
- `SaaS_Platform_POS/src/invoices/services/invoice-pdf.service.ts`
- `SaaS_Platform_POS/src/invoices/services/invoice-settings-resolver.service.ts`

**Status:** The PDF generation code is correct:
- Line 283: Checks for `branding.logoUrl` and includes it in the PDF
- Logo upload handler saves to Supabase and stores URL in database
- Settings resolver properly retrieves the logo URL from saved settings

**Issue:** Logo might not appear if:
1. The logo wasn't properly saved to the database
2. The Supabase URL is inaccessible
3. The settings aren't being properly loaded

---

## ⚠️ Primary Issue: 404 Errors for Bank Accounts and Transport Agents

### Root Cause Analysis

The frontend is getting 404 errors when calling:
- `GET /api/v1/invoices/bank-accounts?locationId={uuid}`
- `GET /api/v1/invoices/transport-agents?locationId={uuid}`

**Backend Route Registration:**
✅ Controllers are properly configured:
- `@Controller('invoices/bank-accounts')` in `bank-account.controller.ts`
- `@Controller('invoices/transport-agents')` in `transport-agent.controller.ts`

✅ Controllers are registered in `InvoicesModule`

✅ `InvoicesModule` is imported in `AppModule`

**Possible Causes:**

1. **Backend Not Running or Stale Process**
   - Old backend process still running on port 4000 with outdated code
   - New backend process failed to start
   - Watch mode didn't properly recompile

2. **Frontend Caching**
   - Browser cached old 404 responses
   - Need hard refresh to clear cache

3. **Authentication/Guard Issues**
   - JWT token expired or invalid
   - BusinessTypeGuard rejecting requests (but would be 403, not 404)
   - SubscriptionGuard rejecting requests

---

## 🔧 Manual Diagnostic Steps (Since Terminal is Disabled)

### Step 1: Verify Backend is Running

Open a new terminal and run:

```bash
# Check if any node process is running on port 4000
lsof -i :4000

# Or check all node processes
ps aux | grep node
```

**If multiple processes are running:**
```bash
# Kill all node processes
pkill -f node

# Then restart backend fresh
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS
npm run build
npm run start:prod
```

### Step 2: Verify Routes are Registered

After starting the backend, check the startup logs. You should see:
```
[Nest] LOG [RouterExplorer] Mapped {/api/v1/invoices/bank-accounts, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/v1/invoices/transport-agents, GET} route
```

**If routes are NOT shown:** The InvoicesModule might not be properly imported.

### Step 3: Test Endpoints Directly with curl

```bash
# Get your auth token first (login if needed)
# Then test the endpoints:

curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:4000/api/v1/invoices/bank-accounts?locationId=fe7a8809-db2d-42b6-86d0-583114ecedf4"

curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:4000/api/v1/invoices/transport-agents?locationId=fe7a8809-db2d-42b6-86d0-583114ecedf4"
```

**Expected Response:** Array of records (even if empty `[]`)

**If 404:** Backend routes are not registered
**If 401:** Token is invalid or expired
**If 403:** Business type is not RETAIL or subscription issue

### Step 4: Hard Refresh Frontend

1. Open the Invoice Settings page in your browser
2. Press **Ctrl+Shift+R** (Linux/Windows) or **Cmd+Shift+R** (Mac) to hard refresh
3. Open browser DevTools (F12)
4. Go to Network tab
5. Reload the page and check the API calls

**Look for:**
- Status codes (should be 200, not 404)
- Request URL (should be `http://localhost:4000/api/v1/invoices/bank-accounts?locationId=...`)
- Response body (should be an array)

### Step 5: Check Database

Verify data exists in the database:

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS
npx ts-node scripts/check-data.ts
```

Or use Prisma Studio:
```bash
npx prisma studio
```

Navigate to:
- **BankAccount** table - should have 2 records (Canara Bank)
- **TransportAgent** table - should have 1 record (Silver Roadlines)

---

## 🎯 Recommended Fix Procedure

### Complete Backend Restart

```bash
# 1. Stop all node processes
pkill -f node

# Wait 2 seconds
sleep 2

# 2. Navigate to backend folder
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS

# 3. Clean build artifacts
rm -rf dist

# 4. Fresh build
npm run build

# 5. Start in production mode
npm run start:prod
```

**Watch for these log messages:**
```
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG [RouterExplorer] Mapped {/api/v1/invoices/bank-accounts, GET} route
[Nest] LOG [RouterExplorer] Mapped {/api/v1/invoices/transport-agents, GET} route
```

### Frontend Hard Refresh

1. Open browser
2. Navigate to Invoice Settings page
3. Press **Ctrl+Shift+R** (hard refresh)
4. Check if bank accounts and transport agents now load

---

## 📝 Additional Checks

### 1. Verify Environment Variables

Check if `NEXT_PUBLIC_API_URL` is set in frontend:

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/pos-frontend
cat .env.local 2>/dev/null || echo "No .env.local file"
```

**Expected:** Either no file (defaults to `http://localhost:4000/api/v1`) or:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### 2. Check Backend Global Prefix

Verify the backend uses `/api/v1` prefix:

```bash
grep -n "setGlobalPrefix" /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS/src/main.ts
```

**Expected:**
```typescript
app.setGlobalPrefix('api/v1');
```

### 3. Verify Business Type

Check your tenant's business type in the database:

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS
npx prisma studio
```

Open **Tenant** table, find your tenant, verify `businessType` is `RETAIL`.

Bank accounts and transport agents are **RETAIL-only features**.

---

## 🚀 Testing After Fix

Once backend is running and frontend is refreshed:

1. **Go to Invoice Settings** → **Bank Accounts tab**
   - Should show 2 bank accounts (Canara Bank)
   - Should be able to add/edit/delete accounts
   - Should be able to set a default account

2. **Go to Invoice Settings** → **Transport Agents tab**
   - Should show 1 transport agent (Silver Roadlines)
   - Should be able to add/edit/delete agents

3. **Go to Invoice Settings** → **Branding tab**
   - Should now see ALL business information fields
   - Fill in all required fields and save
   
4. **Create a New Invoice**
   - Bank account dropdown should show your accounts
   - Transport agent dropdown should show your agents
   - Select them and create an invoice

5. **Download Invoice PDF**
   - Logo should appear in the header
   - All branding details should be visible
   - Bank details should appear in footer
   - Transport details should appear if selected

---

## 🐛 If Issues Persist

### Check Backend Logs in Real-Time

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/SaaS_Platform_POS
npm run start:prod 2>&1 | tee backend.log
```

This will show logs in terminal AND save to `backend.log` file.

When you access the Invoice Settings page, you should see:
```
[BankAccount] findAll called - tenantId: xxx locationId: xxx
[BankAccount] findAll result: 2 records
```

### Check Frontend Console Logs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Reload Invoice Settings page
4. Look for logs starting with `[Frontend]`

You should see:
```
[Frontend] fetchBankAccounts called
[Frontend] Locations response: 1 locations
[Frontend] Fetching bank accounts for location: xxx
[Frontend] Bank accounts response: 2 accounts
```

### Enable Verbose Backend Logging

Temporarily add more logging to controller:

Edit: `SaaS_Platform_POS/src/invoices/bank-accounts/bank-account.controller.ts`

Add at the start of findAll method:
```typescript
console.log('=== BANK ACCOUNTS REQUEST DEBUG ===');
console.log('Headers:', req.headers);
console.log('Query Params:', req.query);
console.log('User:', req.user);
console.log('Tenant ID:', tenantId);
console.log('Location ID:', locationId);
```

Then rebuild and restart backend.

---

## 📞 Need More Help?

If the issue persists after following these steps:

1. **Capture the following information:**
   - Backend startup logs (copy entire output)
   - Browser console logs (copy all errors)
   - Browser network tab (screenshot of failed request)
   - Output of `lsof -i :4000`
   - Output of `ps aux | grep node`

2. **Check if the backend port changed:**
   - Some process might be using port 4000
   - Backend might have started on a different port
   - Check backend logs for: `Application is running on: http://localhost:XXXX`

3. **Verify database connection:**
   - Backend logs should show: `Prisma Client initialized`
   - If not, check DATABASE_URL in backend `.env` file

---

## ✨ Summary of What Should Work Now

✅ **Branding Form** - All fields visible and editable
✅ **Invoice Creation** - Bank account & transport agent dropdowns exist
✅ **PDF Generation** - Logo code is correct

⚠️ **404 Errors** - Need manual backend restart and frontend hard refresh

Once the backend is properly restarted and routes are registered, all features should work correctly!
