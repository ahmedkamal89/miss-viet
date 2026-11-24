import fs from 'node:fs/promises';
import path from 'node:path';
import { fail, json } from '@/lib/http';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('Choose a photo to upload.');
  const ext = TYPES[file.type];
  if (!ext) return fail('Upload a JPG, PNG or WebP photo.');
  if (file.size > 4 * 1024 * 1024) return fail('That photo is over 4 MB. Use a smaller one.');
  const name = `dish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`menu/${name}`, file, { access: 'public', contentType: file.type });
    return json({ url: blob.url });
  }
  if (process.env.VERCEL) return fail('Photo uploads need Vercel Blob. Add a Blob store to the project, or paste an image link.', 501);
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return json({ url: `/uploads/${name}` });
}
