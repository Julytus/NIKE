import filters from '../../data/catalog-filters.json' with { type: 'json' };
import {
  CATALOG_MAX_LIMIT,
  CATALOG_PAGE_SIZE,
  catalogTitle,
  expectedList,
  seedCategories,
  seedProducts,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { collectPageErrors } from '../../utils/network.js';

/**
 * Lát `kiem-thu-hoi-quy` (plan/kiem-thu-hoi-quy.md §9.2 TC-06 → TC-10): bộ lọc chạy data-driven trên giao diện
 * từ `data/catalog-filters.json` (cùng file với spec API của lát danh-sach-giay). Mỗi ca bấm trên giao diện
 * theo `ui.steps` (không mở URL có sẵn tham số) rồi so ba chiều: giao diện = dữ liệu mẫu (`c.total`, `c.ids`,
 * `expectedList`) = API (`GET /product/public/list` cùng bộ lọc).
 */

const MOBILE = 'mobile-chrome';

/**
 * @typedef {{
 *   id: string, case: string, filter: Record<string, string>, total: number, ids?: number[],
 *   contains?: number[], excludes?: number[],
 *   ui: { start: string, steps: [string, string][] }
 * }} FilterCase
 */

/** @type {{ single: FilterCase[], combined: FilterCase[], size: FilterCase[] }} */
const data = /** @type {any} */ (filters);

/** Ca theo nhóm + id. @param {'single' | 'combined' | 'size'} group @param {string[]} ids */
const pick = (group, ids) => data[group].filter((c) => ids.includes(c.id));

const nameOf = (/** @type {number} */ id) =>
  /** @type {{ name: string }} */ (seedProducts.find((p) => p.id === id)).name;
const categoryNameOf = (/** @type {string | undefined} */ slug) =>
  seedCategories.find((c) => c.slug === slug)?.name ?? null;

/**
 * Bấm bộ lọc của ca `c` trên giao diện rồi kiểm 4 điều (plan §9.2).
 * @param {{ page: import('@playwright/test').Page, list: import('../../pages/ProductListPage.js').ProductListPage,
 *   api: import('../../api/index.js').Api }} ctx
 * @param {FilterCase} c
 */
async function runCase({ page, list, api }, c) {
  const errors = collectPageErrors(page);
  const { category, ...rest } = c.filter;
  // Thứ tự Featured của 12 thẻ đầu: `ids` ghi tay (nhóm single / combined) phải trùng `expectedList`;
  // nhóm size chỉ ghi `contains` / `excludes` (id phải có / không được có trong toàn bộ kết quả)
  const expected = expectedList(c.filter, { limit: CATALOG_MAX_LIMIT }).items.map((i) => i.id);
  if (c.ids) expect(expected, 'ids trong catalog-filters.json').toEqual(c.ids);
  for (const id of c.contains ?? []) expect(expected, `có id ${id}`).toContain(id);
  for (const id of c.excludes ?? []) expect(expected, `không có id ${id}`).not.toContain(id);
  const expectedNames = expected.slice(0, CATALOG_PAGE_SIZE).map(nameOf);

  await test.step(`bấm trên giao diện: ${JSON.stringify(c.ui.steps)}`, async () => {
    if (c.ui.start === 'search') await page.goto('/', { waitUntil: 'load' });
    else await list.goto(c.ui.start);
    await list.applyFilters(c.ui.steps);
  });

  await test.step('(1) URL = bộ lọc của ca', async () => {
    await list.expectUrlFilter(c.filter);
  });

  await test.step('(2) số trong tiêu đề = total (dữ liệu mẫu)', async () => {
    expect(expectedList(c.filter).total, 'catalog-filters.json lệch products.json').toBe(c.total);
    await expect(list.heading).toHaveText(
      `${catalogTitle(rest, categoryNameOf(category))} (${c.total})`
    );
  });

  await test.step('(3) thẻ trên lưới đúng thứ tự', async () => {
    if (c.total === 0) {
      await expect(list.emptyState).toBeVisible();
      if (c.filter.q) await expect(list.noResultMessage(c.filter.q)).toBeVisible();
      await expect(list.cards).toHaveCount(0);
    } else {
      await expect(list.cards.getByTestId('product-name')).toHaveText(expectedNames);
    }
  });

  await test.step('(4) API cùng bộ lọc trả đúng các thẻ trên lưới', async () => {
    const result = await api.client.expectOk(await api.product.list(c.filter));
    expect(result.total).toBe(c.total);
    expect(result.items.map((/** @type {{ name: string }} */ i) => i.name)).toEqual(
      await list.cardNames()
    );
  });

  expect(errors).toEqual([]);
}

test.describe('Bộ lọc data-driven trên giao diện (desktop)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'nhóm desktop (mobile: TC-10)');
  });

  for (const c of pick('single', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'])) {
    test(`TC-06 ${c.case}`, { tag: '@regression' }, async ({ page, productListPage, api }) => {
      await runCase({ page, list: productListPage, api }, c);
    });
  }

  for (const c of pick('single', ['n', 'o', 'p'])) {
    test(`TC-07 tìm ${c.case}`, { tag: '@regression' }, async ({ page, productListPage, api }) => {
      await runCase({ page, list: productListPage, api }, c);
    });
  }

  for (const c of [...pick('single', ['m']), ...pick('combined', ['a', 'b', 'c', 'd'])]) {
    test(`TC-08 ${c.case}`, { tag: '@regression' }, async ({ page, productListPage, api }) => {
      await runCase({ page, list: productListPage, api }, c);
    });
  }

  for (const c of pick('size', ['a', 'b', 'c', 'd'])) {
    test(`TC-09 ${c.case}`, { tag: '@regression' }, async ({ page, productListPage, api }) => {
      await runCase({ page, list: productListPage, api }, c);
    });
  }
});

test.describe('Bộ lọc data-driven trên giao diện (mobile)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'chỉ chạy ở mobile-chrome');
  });

  const mobileCases = [
    ...pick('single', ['a', 'i']),
    ...pick('combined', ['a']),
    ...pick('size', ['d']),
  ];
  for (const c of mobileCases) {
    test(
      `TC-10 ngăn kéo Filter: ${c.case}`,
      { tag: '@regression' },
      async ({ page, productListPage: list, api }) => {
        await runCase({ page, list, api }, c);
        await expect(list.drawer.root).toBeHidden();
        expect(await list.columnCount()).toBe(2);
      }
    );
  }
});
