/**
 * Phát hiện chữ có dấu tiếng Việt (plan tieng-anh-cua-hang §7.1 bước 1) — dùng để quét giao diện / message API
 * sau khi chuyển ngữ. Chỉ bắt nguyên âm có dấu và "đ"; ký hiệu tiền `₫` không tính.
 */
export const VIETNAMESE_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const GLOBAL_RE = new RegExp(VIETNAMESE_RE.source, 'gi');
const MAX_HITS = 10;
const CONTEXT = 20;

/**
 * Trả tối đa 10 đoạn chữ (±20 ký tự quanh chữ có dấu) để báo lỗi dễ đọc; rỗng nếu không có.
 * Các chữ có dấu nằm gần nhau gộp vào cùng một đoạn.
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function findVietnamese(text) {
  const source = (text ?? '').normalize('NFC');
  /** @type {string[]} */
  const hits = [];
  let coveredUntil = -1;
  for (const match of source.matchAll(GLOBAL_RE)) {
    const index = match.index ?? 0;
    if (index < coveredUntil) continue;
    const start = Math.max(0, index - CONTEXT);
    const end = Math.min(source.length, index + CONTEXT + 1);
    hits.push(source.slice(start, end).replace(/\s+/g, ' ').trim());
    coveredUntil = end;
    if (hits.length >= MAX_HITS) break;
  }
  return hits;
}

/**
 * Chữ người dùng thấy / trình đọc màn hình đọc trong `root`: `innerText` + mọi `aria-label`, `placeholder`,
 * `alt`, `title`. Phần tử khớp `exclude` (vd ô dữ liệu `tbody td` — dữ liệu người dùng nhập) bị bỏ qua.
 * @param {import('@playwright/test').Locator} root
 * @param {{ exclude?: string }} [options]
 * @returns {Promise<string>}
 */
export async function uiTextOf(root, { exclude } = {}) {
  return root.evaluate((el, excludeSelector) => {
    const excluded = excludeSelector ? [...el.querySelectorAll(excludeSelector)] : [];
    const isExcluded = (/** @type {Element} */ node) => excluded.some((x) => x.contains(node));

    let text = /** @type {HTMLElement} */ (el).innerText ?? '';
    for (const node of excluded) {
      const cell = /** @type {HTMLElement} */ (node).innerText?.trim();
      if (cell) text = text.split(cell).join(' ');
    }
    const attrs = ['aria-label', 'placeholder', 'alt', 'title'];
    const values = [el, ...el.querySelectorAll(attrs.map((a) => `[${a}]`).join(','))]
      .filter((node) => !isExcluded(node))
      .flatMap((node) => attrs.map((a) => node.getAttribute(a)).filter(Boolean));
    return [text, ...values].join('\n');
  }, exclude ?? null);
}

/**
 * Quét `root` và trả các đoạn chữ có dấu tìm được (rỗng = đạt).
 * @param {import('@playwright/test').Locator} root
 * @param {{ exclude?: string }} [options]
 */
export async function scanVietnamese(root, options) {
  return findVietnamese(await uiTextOf(root, options));
}
