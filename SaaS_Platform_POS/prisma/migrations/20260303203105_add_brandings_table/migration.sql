-- CreateTable
CREATE TABLE "brandings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "business_name" TEXT,
    "company_tagline" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "cin_number" TEXT,
    "logo_url" TEXT,
    "logo_position" TEXT DEFAULT 'left',
    "logo_width" INTEGER DEFAULT 150,
    "primary_color" TEXT DEFAULT '#1e40af',
    "accent_color" TEXT DEFAULT '#3b82f6',
    "signature_url" TEXT,
    "signature_text" TEXT DEFAULT 'Authorized Signatory',
    "stamp_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "brandings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brandings_tenant_id_location_id_idx" ON "brandings"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "brandings_location_id_is_default_idx" ON "brandings"("location_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "brandings_location_id_name_key" ON "brandings"("location_id", "name");

-- AddForeignKey
ALTER TABLE "brandings" ADD CONSTRAINT "brandings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brandings" ADD CONSTRAINT "brandings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
