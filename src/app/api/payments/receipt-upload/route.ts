import { NextRequest, NextResponse } from 'next/server';
import { safeAuth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { detectMagicMime, MAX_UPLOAD_SIZE_BYTES } from '@/lib/security/file-upload-validator';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  try {
    const session = await safeAuth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const formData = await req.formData();
    const bookingId = formData.get('bookingId') as string;

    if (!bookingId) {
      return NextResponse.json({ error: 'شناسه سفارش/رزرو الزامی است' }, { status: 400 });
    }

    // Verify booking exists and user has access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, customerId: true, status: true, paymentStatus: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'سفارش مورد نظر یافت نشد' }, { status: 404 });
    }

    const isCustomer = booking.customerId === session.user.id;
    const isStaff = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (!isCustomer && !isStaff) {
      return NextResponse.json({ error: 'شما به این سفارش دسترسی ندارید' }, { status: 403 });
    }

    // Prepare upload directory with strict path resolution
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'receipts');
    await fs.mkdir(uploadDir, { recursive: true });

    // Handle receipt images (1 to 10)
    const receiptFiles = formData.getAll('receipts') as File[];
    if (!receiptFiles || receiptFiles.length === 0) {
      return NextResponse.json({ error: 'حداقل یک تصویر رسید باید ارسال شود' }, { status: 400 });
    }

    if (receiptFiles.length > 10) {
      return NextResponse.json({ error: 'حداکثر ۱۰ تصویر رسید مجاز است' }, { status: 400 });
    }

    const savedReceiptUrls: string[] = [];

    for (const file of receiptFiles) {
      if (!(file instanceof File) || file.size === 0) continue;

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: `حجم فایل ${file.name} بیشتر از ۵ مگابایت است` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const detectedMime = detectMagicMime(buffer);

      if (!detectedMime || !ALLOWED_IMAGE_MIMES.has(detectedMime)) {
        return NextResponse.json(
          { error: `فرمت فایل ${file.name} مجاز نیست. فقط JPG، PNG و WebP پذیرفته می‌شود.` },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[detectedMime] || '.jpg';
      const safeFilename = `rcpt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
      const filePath = path.resolve(uploadDir, safeFilename);

      if (!filePath.startsWith(uploadDir + path.sep)) {
        return NextResponse.json({ error: 'مسیر فایل نامعتبر است' }, { status: 400 });
      }

      await fs.writeFile(filePath, buffer);
      savedReceiptUrls.push(`/uploads/receipts/${safeFilename}`);
    }

    // Optional National ID card image
    let nationalIdUrl: string | null = null;
    const nationalIdFile = formData.get('nationalId') as File | null;
    if (nationalIdFile && nationalIdFile instanceof File && nationalIdFile.size > 0) {
      if (nationalIdFile.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'حجم فایل کارت ملی بیشتر از ۵ مگابایت است' },
          { status: 400 }
        );
      }

      const nidBuffer = Buffer.from(await nationalIdFile.arrayBuffer());
      const detectedNidMime = detectMagicMime(nidBuffer);

      if (!detectedNidMime || !ALLOWED_IMAGE_MIMES.has(detectedNidMime)) {
        return NextResponse.json(
          { error: 'فرمت فایل کارت ملی نامعتبر است. فقط تصویر پذیرفته می‌شود.' },
          { status: 400 }
        );
      }

      const nidExt = EXTENSION_MAP[detectedNidMime] || '.jpg';
      const nidFilename = `nid_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${nidExt}`;
      const nidPath = path.resolve(uploadDir, nidFilename);

      if (!nidPath.startsWith(uploadDir + path.sep)) {
        return NextResponse.json({ error: 'مسیر فایل کارت ملی نامعتبر است' }, { status: 400 });
      }

      await fs.writeFile(nidPath, nidBuffer);
      nationalIdUrl = `/uploads/receipts/${nidFilename}`;
    }

    return NextResponse.json({
      success: true,
      receiptImages: savedReceiptUrls,
      nationalIdImage: nationalIdUrl,
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    return NextResponse.json({ error: 'خطا در ذخیره‌سازی فایل‌ها' }, { status: 500 });
  }
}
