import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/domains/identity/permission-service';
import { safeAuth } from '@/auth';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * T0504 — CMS image upload for the specialist Child editor.
 * Guarded with `content:manage`; image-only (jpg/png/webp), 5MB cap,
 * randomized filenames under public/uploads/cms (no original-name trust,
 * SEC-004-style path resolution).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('content:manage');
    void user;

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Image file is required', code: 'validation_error' },
        { status: 422 }
      );
    }

    const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPG, PNG or WebP images are allowed', code: 'unsupported_type' },
        { status: 422 }
      );
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image exceeds the 5MB limit', code: 'file_too_large' },
        { status: 422 }
      );
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extByMime[file.type];
    const fileName = `${crypto.randomBytes(12).toString('hex')}${ext}`;

    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'cms');
    const target = path.resolve(uploadDir, fileName);
    if (!target.startsWith(uploadDir + path.sep)) {
      return NextResponse.json(
        { success: false, error: 'Invalid upload path', code: 'path_violation' },
        { status: 400 }
      );
    }

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(target, Buffer.from(await file.arrayBuffer()));

    const session = await safeAuth();
    void session;

    return NextResponse.json({ success: true, data: { url: `/uploads/cms/${fileName}` } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unauthorized|no active authenticated principal|principal .* not found|forbidden/i.test(message)) {
      return NextResponse.json(
        { success: false, error: 'Not allowed to upload CMS media', code: 'forbidden' },
        { status: 403 }
      );
    }
    console.error('cms upload error:', err);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
