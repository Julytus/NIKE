/* global document -- dùng trong page.evaluate (chạy ở trình duyệt) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

import knownList from '../data/a11y-known.json' with { type: 'json' };
import { docShot } from './doc-shot.js';

/**
 * Quét khả năng truy cập bằng axe (plan kiem-thu-giao-dien §3 L2, §5.4): WCAG 2.1 A + AA, bỏ phần devtools của
 * Vite dev. Vi phạm `serious` / `critical` không có trong `data/a11y-known.json` làm test đỏ; `moderate` /
 * `minor` chỉ ghi annotation. Mỗi lần quét ghi `a11y-results/<project>/<tên>.json` cho `pnpm report:a11y`.
 */

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING = new Set(['serious', 'critical']);
const RESULTS_DIR = fileURLToPath(new URL('../a11y-results', import.meta.url));

/**
 * @typedef {{ rule: string, pages: string[], target: string, reason: string, ticket?: string }} KnownItem
 * @typedef {{
 *   page: string, project: string, rule: string, impact: string | null, nodes: number, targets: string[],
 *   help: string, helpUrl: string, known: string | null
 * }} A11yRow
 */

/** @type {KnownItem[]} */
const KNOWN = knownList.items;

/**
 * Lý do chấp nhận nếu vi phạm có trong danh sách: trùng `rule`, `pages` chứa tên quét (hoặc `"*"`), `target` là
 * chuỗi con của một selector.
 * @param {string} rule
 * @param {string} name
 * @param {string[]} selectors
 */
function knownReason(rule, name, selectors) {
  const item = KNOWN.find(
    (k) =>
      k.rule === rule &&
      (k.pages.includes('*') || k.pages.includes(name)) &&
      selectors.some((s) => s.includes(k.target))
  );
  return item ? item.reason : null;
}

/**
 * Message lỗi dạng bảng (§5.4).
 * @param {A11yRow[]} rows
 * @param {string} name
 * @param {string} project
 */
export function formatViolations(rows, name, project) {
  const lines = rows.map(
    (r) => `  - [${r.impact}] ${r.rule} × ${r.nodes} — ${r.targets.join(', ')} — ${r.help}`
  );
  return [`Vi phạm WCAG 2.1 AA ở ${name} (${project}): ${rows.length}`, ...lines].join('\n');
}

/**
 * Quét trang ở trạng thái hiện tại.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {string} name tên quét (§6.2), vd `pdp-size-error`
 * @param {{ include?: string | string[], exclude?: string | string[], soft?: boolean, demo?: boolean }} [options]
 *   `soft` (mặc định true): dùng `expect.soft` để quét tiếp các trạng thái sau trong cùng test;
 *   `demo`: lần quét chứng minh (TC-31) — `report:a11y` không tính vào bảng.
 * @returns {Promise<A11yRow[]>}
 */
export async function scanA11y(page, testInfo, name, options = {}) {
  const { include, exclude, soft = true, demo = false } = options;
  const project = testInfo.project.name;
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS).exclude('.tsqd-parent-container');
  for (const s of [include ?? []].flat()) builder = builder.include(s);
  for (const s of [exclude ?? []].flat()) builder = builder.exclude(s);
  const result = await builder.analyze();

  /** @type {A11yRow[]} */
  const rows = result.violations.map((v) => {
    const selectors = v.nodes.map((n) => n.target.map(String).join(' '));
    return {
      page: name,
      project,
      rule: v.id,
      impact: v.impact ?? null,
      nodes: v.nodes.length,
      targets: selectors.slice(0, 3),
      help: v.help,
      helpUrl: v.helpUrl,
      known: knownReason(v.id, name, selectors),
    };
  });
  /** @type {Record<string, number>} */
  const incomplete = {};
  for (const i of result.incomplete) incomplete[i.id] = i.nodes.length;

  const json = JSON.stringify({ page: name, project, demo, violations: rows, incomplete }, null, 2);
  const dir = path.join(RESULTS_DIR, project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), json);
  await testInfo.attach(`axe-${name}.json`, { body: json, contentType: 'application/json' });

  for (const r of rows) {
    if (r.known) {
      testInfo.annotations.push({
        type: 'a11y-known',
        description: `${r.rule} ở ${name} — ${r.known}`,
      });
    } else if (!BLOCKING.has(r.impact ?? '')) {
      testInfo.annotations.push({
        type: 'a11y-warning',
        description: `${r.rule} × ${r.nodes} ở ${name}`,
      });
    }
  }

  if (process.env.E2E_DOC_SHOTS && rows.length > 0) {
    await shotViolations(
      page,
      testInfo,
      name,
      result.violations.flatMap((v) => v.nodes)
    );
  }

  const blocking = rows.filter((r) => !r.known && BLOCKING.has(r.impact ?? ''));
  const message = formatViolations(blocking, name, project);
  if (soft) expect.soft(blocking, message).toEqual([]);
  else expect(blocking, message).toEqual([]);
  return rows;
}

/**
 * Tô viền đỏ các phần tử vi phạm, chụp `a11y-<tên>[-mobile].png` rồi gỡ viền.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {string} name
 * @param {{ target: unknown[] }[]} nodes
 */
async function shotViolations(page, testInfo, name, nodes) {
  // Phần tử trong iframe / shadow DOM (target nhiều cấp) bỏ qua — trang hiện không có.
  const selectors = nodes.filter((n) => n.target.length === 1).map((n) => String(n.target[0]));
  const mark = (/** @type {boolean} */ on) =>
    page.evaluate(
      ([list, enable]) => {
        for (const s of /** @type {string[]} */ (list)) {
          for (const el of document.querySelectorAll(s)) {
            const style = /** @type {HTMLElement} */ (el).style;
            style.outline = enable ? '3px solid #e00' : '';
            style.outlineOffset = enable ? '-3px' : '';
          }
        }
      },
      [selectors, on]
    );
  await mark(true);
  const suffix = testInfo.project.name === 'mobile-chrome' ? '-mobile' : '';
  await docShot(page, testInfo, `a11y-${name}${suffix}`);
  await mark(false);
}
