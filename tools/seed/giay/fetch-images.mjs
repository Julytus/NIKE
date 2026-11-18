// Tải 5 ảnh của mỗi sản phẩm trong products.json, đổi sang webp rộng 1000 px (chất lượng 80),
// ghi vào backend/business/src/main/resources/seed/giay/<slug>/<n>.webp.
// File đã có thì bỏ qua; giữa hai lần tải giãn cách 1 giây. Xem README.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const seedDir = join(here, '../../../backend/business/src/main/resources/seed/giay');
const { products } = JSON.parse(readFileSync(join(seedDir, 'products.json'), 'utf8'));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DELAY_MS = 1000;
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let downloaded = 0;
let skipped = 0;
for (const product of products) {
  if (product.sourceImages?.length !== 5) {
    throw new Error(`Sản phẩm ${product.id} (${product.slug}) phải có đúng 5 sourceImages`);
  }
  const dir = join(seedDir, product.slug);
  mkdirSync(dir, { recursive: true });
  for (const [index, url] of product.sourceImages.entries()) {
    const file = join(dir, `${index + 1}.webp`);
    if (!force && existsSync(file)) {
      skipped++;
      continue;
    }
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'image/webp,image/*' } });
    if (!res.ok) throw new Error(`Tải ảnh lỗi HTTP ${res.status}: ${product.slug} #${index + 1} ${url}`);
    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .flatten({ background: '#f5f5f5' })
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    writeFileSync(file, output);
    downloaded++;
    console.log(`${product.slug}/${index + 1}.webp  ${(output.length / 1024).toFixed(0)} KB`);
    await sleep(DELAY_MS);
  }
}
console.log(`Xong: tải ${downloaded} ảnh, bỏ qua ${skipped} ảnh đã có.`);
