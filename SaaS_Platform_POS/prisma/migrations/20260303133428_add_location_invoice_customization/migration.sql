-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "sac_code" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "bank_account_id" TEXT,
ADD COLUMN     "challan_date" TIMESTAMP(3),
ADD COLUMN     "challan_number" TEXT,
ADD COLUMN     "eway_bill_date" TIMESTAMP(3),
ADD COLUMN     "eway_bill_number" TEXT,
ADD COLUMN     "lr_number" TEXT,
ADD COLUMN     "place_of_supply" TEXT,
ADD COLUMN     "transport_agent_id" TEXT,
ADD COLUMN     "vehicle_number" TEXT;

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "branch_name" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'CURRENT',
    "upi_id" TEXT,
    "qr_code_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_agents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "transporter_id" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "default_mode" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hsn_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" TEXT,
    "heading" TEXT,
    "gst_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hsn_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sac_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "gst_rate" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sac_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_tenant_id_location_id_idx" ON "bank_accounts"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "bank_accounts_location_id_is_default_idx" ON "bank_accounts"("location_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_location_id_account_name_key" ON "bank_accounts"("location_id", "account_name");

-- CreateIndex
CREATE INDEX "transport_agents_tenant_id_location_id_idx" ON "transport_agents"("tenant_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "transport_agents_location_id_agent_name_key" ON "transport_agents"("location_id", "agent_name");

-- CreateIndex
CREATE UNIQUE INDEX "hsn_codes_code_key" ON "hsn_codes"("code");

-- CreateIndex
CREATE INDEX "hsn_codes_code_idx" ON "hsn_codes"("code");

-- CreateIndex
CREATE INDEX "hsn_codes_chapter_idx" ON "hsn_codes"("chapter");

-- CreateIndex
CREATE UNIQUE INDEX "sac_codes_code_key" ON "sac_codes"("code");

-- CreateIndex
CREATE INDEX "sac_codes_code_idx" ON "sac_codes"("code");

-- CreateIndex
CREATE INDEX "sac_codes_category_idx" ON "sac_codes"("category");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transport_agent_id_fkey" FOREIGN KEY ("transport_agent_id") REFERENCES "transport_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_agents" ADD CONSTRAINT "transport_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_agents" ADD CONSTRAINT "transport_agents_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
