/**
 * Seeds InventoryItems and Allotments from hotels-iran-master.json into the database.
 * Usage: npx tsx scripts/seed-inventory-from-json.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding inventory from JSON catalog...');

  const jsonPath = path.join(__dirname, '..', 'src', 'data', 'server', 'hotels-iran-master.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('File not found:', jsonPath);
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const catalog = JSON.parse(raw);

  // Extract all hotels across all cities
  const allHotels: Array<{ hotel_id: string; hotel_name: string; stars?: number }> = [];
  if (Array.isArray(catalog.cities)) {
    for (const c of catalog.cities) {
      if (Array.isArray(c.hotels)) {
        for (const h of c.hotels) {
          allHotels.push(h);
        }
      }
    }
  }

  console.log(`Found ${allHotels.length} total hotels in catalog.`);

  // 1. Ensure a default hotel supplier exists
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup_hotel_iran_allotment' },
    update: { isActive: true },
    create: {
      id: 'sup_hotel_iran_allotment',
      name: 'پلتفرم جامع تأمین هتل‌های ایران',
      type: 'HOTEL',
      mode: 'ALLOTMENT',
      isActive: true,
    },
  });

  console.log(`Using supplier: ${supplier.name} (${supplier.id})`);

  let itemsCreated = 0;
  let allotmentsCreated = 0;

  // Next 14 days of allotments
  const today = new Date();
  const dateStrings: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dateStrings.push(d.toISOString().split('T')[0]);
  }

  // Seed top 30 hotels to keep dev DB snappy
  const sampleHotels = allHotels.slice(0, 30);

  for (const h of sampleHotels) {
    const itemId = `inv_hotel_${h.hotel_id}`;
    const basePrice = (h.stars || 4) * 12_000_000;

    const invItem = await prisma.inventoryItem.upsert({
      where: { id: itemId },
      update: {
        name: `${h.hotel_name} - اتاق دبل استاندارد`,
        basePrice,
        currency: 'IRR',
        supplierId: supplier.id,
      },
      create: {
        id: itemId,
        supplierId: supplier.id,
        type: 'HOTEL_ROOM',
        code: String(h.hotel_id),
        name: `${h.hotel_name} - اتاق دبل استاندارد`,
        basePrice,
        currency: 'IRR',
      },
    });
    itemsCreated++;

    // Seed allotments
    for (const d of dateStrings) {
      await prisma.allotment.upsert({
        where: {
          inventoryItemId_date: {
            inventoryItemId: invItem.id,
            date: d,
          },
        },
        update: {},
        create: {
          inventoryItemId: invItem.id,
          date: d,
          total: 5,
          booked: 0,
          stopSell: false,
        },
      });
      allotmentsCreated++;
    }
  }

  console.log(`Successfully seeded ${itemsCreated} inventory items and ${allotmentsCreated} allotments.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
