import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function seedHSNSAC() {
  console.log('🌱 Seeding HSN/SAC codes...');

  // Read HSN codes
  const hsnCodesPath = path.join(__dirname, '../prisma/seeds/hsn-codes.json');
  const hsnCodesData = fs.readFileSync(hsnCodesPath, 'utf-8');
  const hsnCodes = JSON.parse(hsnCodesData);

  console.log(`📦 Found ${hsnCodes.length} HSN codes to seed`);

  // Seed HSN codes
  const hsnResult = await prisma.hSNCode.createMany({
    data: hsnCodes,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${hsnResult.count} HSN codes`);

  // Read SAC codes
  const sacCodesPath = path.join(__dirname, '../prisma/seeds/sac-codes.json');
  const sacCodesData = fs.readFileSync(sacCodesPath, 'utf-8');
  const sacCodes = JSON.parse(sacCodesData);

  console.log(`📦 Found ${sacCodes.length} SAC codes to seed`);

  // Seed SAC codes
  const sacResult = await prisma.sACCode.createMany({
    data: sacCodes,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${sacResult.count} SAC codes`);

  // Get total counts
  const hsnCount = await prisma.hSNCode.count();
  const sacCount = await prisma.sACCode.count();

  console.log('\n📊 Summary:');
  console.log(`   Total HSN codes in database: ${hsnCount}`);
  console.log(`   Total SAC codes in database: ${sacCount}`);
  console.log(`   Total codes: ${hsnCount + sacCount}`);
  console.log('\n✨ HSN/SAC seeding completed!');
}

seedHSNSAC()
  .catch((error) => {
    console.error('❌ Error seeding HSN/SAC codes:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
