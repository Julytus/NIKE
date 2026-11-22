/**
 * Nhãn Allure suy ra từ đường dẫn spec (plan ci-bao-cao §6.3), để spec không phải tự gắn:
 *   khu vực   = thư mục cấp 1 dưới `tests/`;
 *   plan-slug = tên file bỏ `.spec.js` / `.api.spec.js` (`auth`, `role`, `admin-login` → `khung-automation`);
 *   tên lát   = `title` ở front matter của `plan/<plan-slug>.md`, phần trước " — " đầu tiên, bỏ "(…)" ở cuối.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const PLAN_DIR = path.join(ROOT, '..', 'plan');

/** Spec của khung bộ test, không có plan riêng. */
const SLUG_ALIAS = /** @type {Record<string, string>} */ ({
  auth: 'khung-automation',
  role: 'khung-automation',
  'admin-login': 'khung-automation',
});

/** @type {Map<string, string | null>} tên lát theo slug, cache theo tiến trình */
const epicCache = new Map();

/**
 * Tên lát đọc từ plan; không có plan thì `null`.
 * @param {string} slug
 */
export function planTitle(slug) {
  if (!epicCache.has(slug)) {
    let title = null;
    try {
      const text = fs.readFileSync(path.join(PLAN_DIR, `${slug}.md`), 'utf8');
      const raw = text.match(/^title:\s*(.+)$/m)?.[1];
      if (raw) {
        title = raw
          .split(' — ')[0]
          .replace(/\s*\([^()]*\)\s*$/, '')
          .trim();
      }
    } catch {
      title = null;
    }
    epicCache.set(slug, title);
  }
  return epicCache.get(slug) ?? null;
}

/**
 * Nhãn của một file spec.
 * @param {string} file đường dẫn tuyệt đối (testInfo.file) hoặc tương đối với `automation/`
 * @returns {{ area: string, slug: string, epic: string, feature: string, hasPlan: boolean }}
 */
export function labelsForFile(file) {
  const rel = path.relative(TESTS_DIR, path.resolve(ROOT, file)).split(path.sep);
  const area = rel.length > 1 ? rel[0] : '';
  const base = rel[rel.length - 1].replace(/(\.api)?\.(spec|setup)\.js$/, '');
  const slug = SLUG_ALIAS[base] ?? base;
  const title = planTitle(slug);
  return {
    area,
    slug,
    epic: title ?? slug,
    feature: area === 'api' ? 'API' : `Giao diện · ${area || 'chung'}`,
    hasPlan: title !== null,
  };
}

/**
 * Mức nghiêm trọng theo tag.
 * @param {readonly string[]} tags vd ['@smoke']
 * @returns {'critical' | 'normal' | undefined}
 */
export function severityForTags(tags) {
  if (tags.includes('@smoke')) return 'critical';
  if (tags.includes('@regression')) return 'normal';
  return undefined;
}
