import {
  catalogTitle,
  expectedFacets,
  expectedList,
  seedCategories,
} from '../../data/seed-products.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';
import { apiPath, collectPageErrors, fail500, sleep } from '../../utils/network.js';
import { scanVietnamese } from '../../utils/vietnamese.js';

/**
 * Lát `danh-sach-giay` (plan/danh-sach-giay.md §6, §9 TC-14 → TC-30): trang `/w`, `/w/<danh mục>` —
 * tiêu đề có số lượng, sidebar lọc + số đếm, sắp xếp, tải thêm khi cuộn, rỗng / lỗi, link danh mục,
 * "Related Categories"; mobile: pill + ngăn kéo "Filter". Kết quả mong đợi tính từ `products.json`
 * (`expectedList`, `expectedFacets`, `catalogTitle`).
 */

const MOBILE = 'mobile-chrome';
const API = {
  list: apiPath('/product/public/list'),
  facets: apiPath('/product/public/facets'),
};
const SORTS = [
  { label: 'Price: Low-High', value: 'price-asc' },
  { label: 'Price: High-Low', value: 'price-desc' },
  { label: 'Newest', value: 'newest' },
  { label: 'Featured', value: 'featured' },
];
const GROUP_NAMES = ['Gender', 'Kids', 'Shop by Price', 'Sale & Offers', 'New & Popular', 'Size'];
const GROUP_KEYS = ['gender', 'kids', 'price', 'sale', 'badge', 'size'];
const CATEGORY_LINKS = ['All Shoes', ...sortedCategories().map((c) => c.name)];

/** @typedef {import('../../data/seed-products.js').CatalogFilter} CatalogFilter */

function sortedCategories() {
  return [...seedCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Tên danh mục theo slug. @param {string | undefined} slug */
const categoryNameOf = (slug) => seedCategories.find((c) => c.slug === slug)?.name ?? null;

/**
 * h1 mong đợi `<tiêu đề> (<total>)` của trang `path` (+ search).
 * @param {string} path `/w` hoặc `/w/<slug>`
 * @param {CatalogFilter} [search]
 */
function headingOf(path, search = {}) {
  const slug = path.split('/')[2];
  const filter = slug ? { ...search, category: slug } : search;
  return `${catalogTitle(search, categoryNameOf(slug))} (${expectedList(filter).total})`;
}

/** Tên 12 thẻ đầu mong đợi. @param {CatalogFilter} filter */
const namesOf = (filter) => expectedList(filter).items.map((i) => i.name);

/**
 * Ghi giá trị `page` của mọi request tới `list`.
 * @param {import('@playwright/test').Page} page
 */
function collectListPages(page) {
  /** @type {number[]} */
  const pages = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.pathname.endsWith('/product/public/list')) {
      pages.push(Number(url.searchParams.get('page') ?? 1));
    }
  });
  return pages;
}

/**
 * So URL hiện tại với `expected` theo path + từng tham số (không phụ thuộc thứ tự / mã hoá dấu phẩy).
 * @param {import('@playwright/test').Page} page
 * @param {string} expected
 */
async function expectUrl(page, expected) {
  const e = new URL(expected, 'http://x');
  const sorted = (/** @type {URL} */ u) => [...u.searchParams.entries()].sort();
  await expect
    .poll(() => {
      const a = new URL(page.url());
      return { path: a.pathname, params: sorted(a) };
    }, `URL mong đợi ${expected}`)
    .toEqual({ path: e.pathname, params: sorted(e) });
}

/** Trang đang ở đầu vùng cuộn. @param {import('../../pages/ProductListPage.js').ProductListPage} list */
async function expectAtTop(list) {
  await expect.poll(() => list.scrollTop(), 'cuộn về đầu sau khi đổi bộ lọc').toBe(0);
}

test.describe('Danh sách giày desktop', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === MOBILE, 'Nhóm desktop (mobile: TC-29, TC-30)');
  });

  test(
    'TC-14 trang /w mặc định',
    { tag: '@smoke' },
    async ({ page, productListPage: list }, testInfo) => {
      const errors = collectPageErrors(page);
      await list.goto();

      await expect(page).toHaveTitle('Shoes | Nike');
      await expect(list.heading).toHaveText('Shoes (30)');
      await expect(list.cards).toHaveCount(12);
      expect(await list.cardNames()).toEqual(namesOf({}));

      const first = list.card(0);
      await expect(first.name).toHaveText('Nike Dunk Low Retro');
      await expect(first.badge).toHaveText('Just In');
      await expect(first.price).toHaveText('3.519.000 ₫');
      expect(await first.href()).toBe('/t/nike-dunk-low-retro');

      await expect(list.categoryLinks).toHaveText(CATEGORY_LINKS);
      await expect(list.categoryLink('All Shoes')).toHaveAttribute('aria-current', 'page');

      const { sidebar } = list;
      await expect(sidebar.root).toBeVisible();
      await expect(sidebar.groupButtons()).toHaveText(GROUP_NAMES);
      for (const key of GROUP_KEYS) {
        const open = key === 'gender' || key === 'price';
        await expect(sidebar.groupButton(key)).toHaveAttribute('aria-expanded', String(open));
      }
      await expect(sidebar.count('gender', 'men')).toHaveText('(12)');
      await expect(sidebar.count('gender', 'women')).toHaveText('(10)');
      await expect(sidebar.count('price', 'under-1m')).toHaveText('(4)');

      await expect(list.filterToggle).toHaveText('Hide Filters');
      await expect(list.sortTrigger).toHaveText('Sort By');
      await expect(list.relatedHeading).toBeVisible();
      await expect(list.relatedLinks).toHaveCount(5);
      await expect(page.getByText('Coming Soon', { exact: true })).toHaveCount(0);
      await docShot(page, testInfo, '01-danh-sach-mac-dinh');
      expect(errors).toEqual([]);
    }
  );

  test(
    'TC-15 tải thêm khi cuộn + skeleton',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      const pages = collectListPages(page);
      await page.route(API.list, async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get('page') === '2') await sleep(800);
        await route.continue();
      });
      await list.goto();
      await expect(list.cards).toHaveCount(12);

      await list.scrollToBottom();
      await expect(list.skeletons.first()).toBeVisible();
      await expect(list.cards).toHaveCount(24);
      await expect(list.skeletons).toHaveCount(0);

      await list.loadAll();
      await expect(list.cards).toHaveCount(30);
      await list.scrollToBottom();
      await expect(list.skeletons).toHaveCount(0);

      expect(pages).toEqual([1, 2, 3]);
      await expect(list.card(29).name).toHaveText('Nike P-6000');
      await expect(list.card(29).badge).toHaveText('Sold Out');
      await expect(list.card(12).name).toHaveText('Nike Marina');
    }
  );

  test(
    'TC-16 lọc bằng checkbox, số đếm cập nhật',
    { tag: '@smoke' },
    async ({ page, productListPage: list }, testInfo) => {
      const { sidebar } = list;
      await list.goto();
      await expect(list.heading).toHaveText('Shoes (30)');

      await test.step('tick Men', async () => {
        await list.scrollTo(300);
        await sidebar.toggle('gender', 'men');
        await expectUrl(page, '/w?gender=men');
        await expect(list.heading).toHaveText("Men's Shoes (12)");
        await expect(sidebar.option('gender', 'men')).toBeChecked();
        await expect(sidebar.groupButton('gender')).toHaveText('Gender (1)');
        await expect(list.cards).toHaveCount(12);
        expect(await list.cardNames()).toEqual(namesOf({ gender: 'men' }));
        await expect(sidebar.count('price', 'under-1m')).toHaveText('(1)');
        await expect(sidebar.count('price', '1m-2m')).toHaveText('(2)');
        await expect(sidebar.count('price', '2m-5m')).toHaveText('(6)');
        await expect(sidebar.count('price', '5m-plus')).toHaveText('(3)');
        await expectAtTop(list);
      });

      await test.step('tick 1.000.000 ₫ – 2.000.000 ₫', async () => {
        await list.scrollTo(300);
        await sidebar.toggle('price', '1m-2m');
        await expectUrl(page, '/w?gender=men&price=1m-2m');
        await expect(list.heading).toHaveText("Men's Shoes (2)");
        await expectAtTop(list);
      });

      await test.step('chọn EU 42', async () => {
        await sidebar.openGroup('size');
        await sidebar.toggle('size', '42');
        await expectUrl(page, '/w?gender=men&price=1m-2m&size=42');
        await expect(list.heading).toHaveText("Men's Shoes (2)");
        await expect(list.cards).toHaveCount(2);
        expect(await list.cardNames()).toEqual(['Nike Revolution 8', 'Nike Precision 8 Low']);
        await expect(sidebar.option('gender', 'women')).toBeDisabled();
        await expect(sidebar.count('gender', 'women')).toHaveText('(0)');
        await expect(sidebar.groupButton('size')).toHaveText('Size (1)');
        await expectAtTop(list);
        await docShot(page, testInfo, '02-dang-loc');
      });

      await test.step('bỏ tick Men', async () => {
        await sidebar.toggle('gender', 'men');
        await expectUrl(page, '/w?price=1m-2m&size=42');
        await expect(list.heading).toHaveText('Shoes (2)');
        await expect(sidebar.option('gender', 'men')).not.toBeChecked();
        await expectAtTop(list);
      });
    }
  );

  test(
    'TC-17 URL giữ trạng thái: mở thẳng, F5, Back / Forward',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      const { sidebar } = list;
      const expectBasketball = async () => {
        await expect(list.heading).toHaveText("Men's Basketball Shoes (1)");
        await expect(page).toHaveTitle("Men's Basketball Shoes | Nike");
        await expect(sidebar.option('gender', 'men')).toBeChecked();
        await expect(list.categoryLink('Basketball')).toHaveAttribute('aria-current', 'page');
        await expect(list.sortTrigger).toHaveText('Sort By: Price: Low-High');
      };

      await list.goto('/w/basketball', { gender: 'men', sort: 'price-asc' });
      await expectBasketball();
      await page.reload({ waitUntil: 'load' });
      await expectBasketball();

      await list.goto('/w');
      await expect(list.heading).toHaveText('Shoes (30)');
      await sidebar.toggle('gender', 'men');
      await expectUrl(page, '/w?gender=men');
      await sidebar.toggle('gender', 'women');
      await expectUrl(page, '/w?gender=men,women');
      await expect(list.heading).toHaveText('Shoes (22)');

      await page.goBack();
      await expectUrl(page, '/w?gender=men');
      await expect(sidebar.option('gender', 'women')).not.toBeChecked();
      await expect(list.heading).toHaveText("Men's Shoes (12)");

      await page.goBack();
      await expectUrl(page, '/w');
      await expect(list.heading).toHaveText('Shoes (30)');

      await page.goForward();
      await expectUrl(page, '/w?gender=men');
      await expect(list.heading).toHaveText("Men's Shoes (12)");
    }
  );

  test(
    'TC-18 sắp xếp (4 kiểu)',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      await list.goto();
      await expect(list.cards).toHaveCount(12);

      for (const sort of SORTS) {
        await test.step(sort.label, async () => {
          await list.sortBy(sort.label);
          await expectUrl(page, sort.value === 'featured' ? '/w' : `/w?sort=${sort.value}`);
          await expect(list.sortTrigger).toHaveText(
            sort.value === 'featured' ? 'Sort By' : `Sort By: ${sort.label}`
          );
          await expect
            .poll(() => list.cardNames(), `thứ tự ${sort.label}`)
            .toEqual(namesOf({ sort: sort.value }));
        });
      }

      // Kiểm riêng thẻ đầu của hai kiểu theo giá (thứ tự đầy đủ đã khớp expectedList ở trên)
      await list.sortBy('Price: Low-High');
      await expect(list.card(0).name).toHaveText('Nike Marina');
      await expect(list.card(0).price).toHaveText('769.000 ₫');
      await list.sortBy('Price: High-Low');
      await expect(list.card(0).name).toHaveText('Nike Alphafly 4');
      await expect(list.card(0).price).toHaveText('8.059.000 ₫');
    }
  );

  test(
    'TC-19 ẩn / hiện bộ lọc',
    { tag: '@regression' },
    async ({ page, productListPage: list }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await list.goto();
      await expect(list.cards).toHaveCount(12);
      const before = /** @type {{ width: number }} */ (await list.card(0).root.boundingBox()).width;
      const url = page.url();

      await list.filterToggle.click();
      await expect(list.sidebar.root).toBeHidden();
      await expect(list.filterToggle).toHaveText('Show Filters');
      await expect
        .poll(async () => (await list.card(0).root.boundingBox())?.width ?? 0, 'thẻ rộng ra')
        .toBeGreaterThan(before);
      expect(await list.columnCount()).toBe(3);
      expect(page.url()).toBe(url);
      await docShot(page, testInfo, '03-an-bo-loc');

      await list.filterToggle.click();
      await expect(list.sidebar.root).toBeVisible();
      await expect(list.filterToggle).toHaveText('Hide Filters');
      await expect.poll(() => list.columnCount()).toBe(3);
      expect(page.url()).toBe(url);
    }
  );

  test(
    'TC-20 trạng thái rỗng + "Clear Filters"',
    { tag: '@regression' },
    async ({ page, productListPage: list }, testInfo) => {
      await list.goto('/w/football', { gender: 'women' });
      await expect(list.heading).toHaveText("Women's Football Shoes (0)");
      await expect(list.emptyState).toContainText('No products match your filters.');
      await expect(list.cards).toHaveCount(0);
      await docShot(page, testInfo, '04-trong');

      await list.clearFiltersButton.click();
      await expectUrl(page, '/w/football');
      await expect(list.heading).toHaveText(headingOf('/w/football'));
      await expect(list.heading).toHaveText('Football Shoes (2)');

      await list.goto('/w', { q: 'zzzz' });
      await expect(list.eyebrow).toBeVisible();
      await expect(list.heading).toHaveText('zzzz (0)');
      await expect(list.noResultMessage('zzzz')).toBeVisible();
      await expect(
        list.emptyState.getByText('Try a different search term.', { exact: true })
      ).toBeVisible();
      await expect(list.shopAllLink).toHaveAttribute('href', '/w');
    }
  );

  test(
    'TC-21 từ khung tìm kiếm sang kết quả',
    { tag: '@regression' },
    async ({ page, homePage, productListPage: list }) => {
      await homePage.goto();
      const search = await homePage.header.openSearch();
      await search.type('air max');
      await search.submit();

      await expectUrl(page, '/w?q=air+max');
      expect(new URL(page.url()).searchParams.get('q')).toBe('air max');
      await expect(list.eyebrow).toBeVisible();
      await expect(list.heading).toHaveText('air max (2)');
      await expect(page).toHaveTitle('air max | Nike');
      await expect(list.cards).toHaveCount(2);
      expect(await list.cardNames()).toEqual([
        'Nike Air Max 95 Big Bubble Premium',
        'Nike Air Max Phenomena',
      ]);
      await expect(list.grid.getByText('Nike Air Max Plus Premium')).toHaveCount(0);

      await list.sidebar.toggle('gender', 'women');
      await expectUrl(page, '/w?q=air+max&gender=women');
      await expect(list.heading).toHaveText('air max (1)');
    }
  );

  test(
    'TC-22 vào từ menu / trang chủ ra đúng kết quả',
    { tag: '@regression' },
    async ({ page, homePage, productListPage: list }) => {
      const { sidebar } = list;

      await test.step('Men → Basketball', async () => {
        await homePage.goto();
        await expect(homePage.categoryTiles.first()).toBeVisible();
        await homePage.header.hoverNav('Men');
        await homePage.header.megaLink('Basketball').click();
        await expectUrl(page, '/w/basketball?gender=men');
        await expect(list.heading).toHaveText("Men's Basketball Shoes (1)");
        await expect(list.cards).toHaveCount(1);
        const card = list.card(0);
        await expect(card.name).toHaveText('Nike Precision 8 Low');
        await expect(card.badge).toHaveText('Sale');
        await expect(card.price).toHaveText('2.000.000 ₫');
        await expect(card.originalPrice).toHaveText('2.119.000 ₫');
      });

      await test.step('"Shop Now" ở hero', async () => {
        await homePage.goto();
        await homePage.shopNowLink.click();
        await expectUrl(page, '/w?badge=just-in');
        await expect(list.heading).toHaveText('Shoes (8)');
        await expect(sidebar.groupButton('badge')).toHaveText('New & Popular (1)');
        await expect(sidebar.groupButton('badge')).toHaveAttribute('aria-expanded', 'true');
        await expect(sidebar.option('badge', 'just-in')).toBeChecked();
        await expect(list.cards.getByTestId('product-badge')).toHaveText(Array(8).fill('Just In'));
      });

      await test.step('"Kids" ở menu chính', async () => {
        await homePage.goto();
        await homePage.header.navLink('Kids').click();
        await expectUrl(page, '/w?kids=boys,girls');
        await expect(list.heading).toHaveText("Kids' Shoes (4)");
        await expect(sidebar.groupButton('kids')).toHaveText('Kids (2)');
        await expect(sidebar.groupButton('kids')).toHaveAttribute('aria-expanded', 'true');
        await expect(sidebar.option('kids', 'boys')).toBeChecked();
        await expect(sidebar.option('kids', 'girls')).toBeChecked();
      });
    }
  );

  test(
    'TC-23 link danh mục + "Related Categories"',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      await list.goto('/w', { gender: 'women' });
      await expect(list.heading).toHaveText("Women's Shoes (10)");

      await list.categoryLink('Running').click();
      await expectUrl(page, '/w/running?gender=women');
      await expect(list.heading).toHaveText("Women's Running Shoes (4)");
      await expect(list.categoryLink('Running')).toHaveAttribute('aria-current', 'page');

      const related = sortedCategories().filter((c) => c.slug !== 'running');
      await expect(list.relatedLinks).toHaveText(related.map((c) => c.name));
      for (const [i, c] of related.entries()) {
        await expect(list.relatedLinks.nth(i)).toHaveAttribute('href', `/w/${c.slug}`);
      }

      await list.relatedCategories.getByRole('link', { name: 'Jordan', exact: true }).click();
      await expectUrl(page, '/w/jordan');
      await expect(list.heading).toHaveText('Jordan Shoes (5)');

      await list.categoryLink('All Shoes').click();
      await expectUrl(page, '/w');
      await expect(list.heading).toHaveText('Shoes (30)');
    }
  );

  test(
    'TC-24 danh mục lạ → 404; tham số lạ không vỡ trang',
    { tag: '@regression' },
    async ({ page, productListPage: list, notFoundPage }) => {
      await notFoundPage.goto('/w/khong-co');
      await expect(notFoundPage.message).toBeVisible();
      await expect(list.header.root).toBeVisible();
      await expect(list.footer.root).toBeVisible();
      await expect(list.grid).toHaveCount(0);

      const errors = collectPageErrors(page);
      await list.goto('/w', { gender: 'xyz', price: 'abc', sort: 'bad', size: 'abc', sale: '2' });
      await expect(list.heading).toHaveText('Shoes (30)');
      await expect(list.sidebar.root.getByRole('checkbox', { checked: true })).toHaveCount(0);
      await expect(list.sortTrigger).toHaveText('Sort By');
      await expect(notFoundPage.message).toHaveCount(0);
      expect(errors).toEqual([]);
    }
  );

  test('TC-25 lưới size', { tag: '@regression' }, async ({ page, productListPage: list }) => {
    const { sidebar } = list;
    await list.goto();
    await sidebar.openGroup('size');
    await expect(sidebar.sizeButtons()).toHaveText(expectedFacets({}).size.map((s) => s.label));
    await expect(sidebar.sizeButtons()).toHaveCount(18);

    await sidebar.toggle('size', '38');
    await expect(sidebar.size(38)).toHaveAttribute('aria-pressed', 'true');
    await expectUrl(page, '/w?size=38');
    await expect(list.heading).toHaveText('Shoes (12)');
    await expect(list.cards).toHaveCount(12);
    const names = await list.cardNames();
    expect(names).toContain('Nike Vaporfly 4');
    expect(names).not.toContain('Nike P-6000');

    await sidebar.toggle('size', '42');
    await expectUrl(page, '/w?size=38,42');
    await expect(list.heading).toHaveText('Shoes (29)');

    await sidebar.toggle('size', '38');
    await expect(sidebar.size(38)).toHaveAttribute('aria-pressed', 'false');
    await expectUrl(page, '/w?size=42');
    await expect(list.heading).toHaveText('Shoes (21)');

    await list.goto('/w', { gender: 'men' });
    await sidebar.openGroup('size');
    for (const v of ['35.5', '36', '36.5', '37.5', '38']) {
      await expect(sidebar.size(v), `EU ${v}`).toBeDisabled();
    }
    await expect(sidebar.size('38.5')).toBeEnabled();
  });

  test(
    'TC-26 thanh tiêu đề + sidebar dính khi cuộn',
    { tag: '@regression' },
    async ({ productListPage: list }) => {
      const banner = list.header.root;
      await list.goto();
      await expect(list.cards).toHaveCount(12);

      await list.scrollTo(1500);
      await expect(banner).toHaveAttribute('data-hidden', 'true');
      await expect(list.heading).toBeInViewport();
      await expect(list.sidebar.root).toBeInViewport();
      await expect
        .poll(async () => (await list.heading.boundingBox())?.y ?? -1, 'h1 dính sát mép trên')
        .toBeLessThanOrEqual(80);
      expect((await list.heading.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);

      await list.scrollTo(1300);
      await expect(banner).toHaveAttribute('data-hidden', 'false');
      await expect
        .poll(async () => {
          const h1 = await list.heading.boundingBox();
          const header = await banner.boundingBox();
          return (h1?.y ?? 0) - ((header?.y ?? 0) + (header?.height ?? 0));
        }, 'h1 không bị header che')
        .toBeGreaterThanOrEqual(0);
    }
  );

  test(
    'TC-27 lỗi mạng (network mocking)',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      await test.step('(a) list lỗi trang đầu → Try Again', async () => {
        await page.route(API.list, fail500);
        await list.goto();
        await expect(list.loadError).toBeVisible();
        await expect(list.retryButton).toBeVisible();
        await page.unroute(API.list);
        await list.retryButton.click();
        await expect(list.cards).toHaveCount(12);
      });

      await test.step('(b) facets lỗi → không số đếm, lọc vẫn chạy', async () => {
        await page.route(API.facets, fail500);
        await list.goto();
        await expect(list.cards).toHaveCount(12);
        await expect(list.sidebar.counts).toHaveCount(0);
        await expect(list.sidebar.root.getByRole('checkbox', { disabled: true })).toHaveCount(0);
        await list.sidebar.toggle('gender', 'men');
        await expect(list.heading).toHaveText("Men's Shoes (12)");
        await page.unroute(API.facets);
      });

      await test.step('(c) lỗi khi tải thêm → Try Again', async () => {
        await list.goto();
        await expect(list.cards).toHaveCount(12);
        await page.route(API.list, async (route) => {
          const url = new URL(route.request().url());
          if (url.searchParams.get('page') === '2') return fail500(route);
          return route.continue();
        });
        await list.scrollToBottom();
        await expect(list.loadMoreError).toBeVisible();
        await expect(list.retryButton).toBeVisible();
        await expect(list.cards).toHaveCount(12);
        await page.unroute(API.list);
        await list.retryButton.click();
        await expect(list.cards).toHaveCount(24);
        await expect(list.loadMoreError).toHaveCount(0);
      });

      await test.step('(d) list chậm → skeleton', async () => {
        await page.route(API.list, async (route) => {
          await sleep(1000);
          await route.continue();
        });
        await list.goto();
        await expect(list.grid).toHaveAttribute('aria-busy', 'true');
        await expect(list.skeletons).toHaveCount(6);
        await expect(list.cards).toHaveCount(12);
        await expect(list.grid).not.toHaveAttribute('aria-busy', 'true');
        await page.unroute(API.list);
      });
    }
  );

  test(
    'TC-28 Back từ trang sản phẩm dùng lại dữ liệu',
    { tag: '@regression' },
    async ({ page, productListPage: list }) => {
      await list.goto();
      await expect(list.cards).toHaveCount(12);
      await expect(async () => {
        await list.scrollToBottom();
        expect(await list.cards.count()).toBeGreaterThanOrEqual(24);
      }).toPass({ timeout: 15_000 });

      const card = list.card(19);
      const href = /** @type {string} */ (await card.href());
      await card.root.click();
      await expectUrl(page, href);

      const pages = collectListPages(page);
      await page.goBack();
      await expectUrl(page, '/w');
      await expect(list.heading).toHaveText('Shoes (30)');
      await expect(list.skeletons).toHaveCount(0);
      expect(await list.cards.count()).toBeGreaterThanOrEqual(24);
      expect(pages.filter((p) => p === 1)).toEqual([]);
    }
  );
});

test.describe('Danh sách giày mobile', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE, 'Chỉ chạy ở mobile-chrome');
  });

  test(
    'TC-29 ngăn kéo lọc',
    { tag: '@smoke' },
    async ({ page, productListPage: list }, testInfo) => {
      const { drawer } = list;
      await list.goto('/w', { gender: 'men' });
      await expect(list.heading).toHaveText("Men's Shoes (12)");

      const pills = [
        'Gender (1)',
        'Kids',
        'Shop by Price',
        'Sale & Offers',
        'New & Popular',
        'Size',
      ];
      for (const [i, key] of GROUP_KEYS.entries()) {
        await expect(list.filterPill(key)).toHaveText(pills[i]);
      }

      await test.step('mở bằng pill "Shop by Price"', async () => {
        await list.filterPill('price').click();
        await expect(drawer.root).toBeVisible();
        await expect(drawer.heading).toBeVisible();
        await expect(drawer.group('price')).toBeInViewport();
        await expect(drawer.option('gender', 'men')).toBeChecked();
        await expect(drawer.sortOption('Featured')).toBeChecked();
        await expect(drawer.counts).toHaveCount(0);
        expect(await scanVietnamese(drawer.root)).toEqual([]);
      });

      await test.step('chọn giá + sắp xếp, Apply', async () => {
        await drawer.option('price', 'under-1m').click();
        await drawer.sortOption('Price: Low-High').click();
        await expect(drawer.clearButton).toHaveText('Clear (2)');
        await docShot(page, testInfo, '06-ngan-keo-mobile');
        await drawer.applyButton.click();
        await expect(drawer.root).toBeHidden();
        await expectUrl(page, '/w?gender=men&price=under-1m&sort=price-asc');
        await expect(list.heading).toHaveText("Men's Shoes (1)");
        await expect(list.card(0).name).toHaveText('Nike Marina');
      });

      await test.step('Clear (2) rồi Apply', async () => {
        await list.filterOpenButton.click();
        await expect(drawer.root).toBeVisible();
        await expect(drawer.clearButton).toHaveText('Clear (2)');
        await drawer.clearButton.click();
        await expect(drawer.clearButton).toHaveText('Clear');
        await expect(drawer.root.getByRole('checkbox', { checked: true })).toHaveCount(0);
        await expect(drawer.sortOption('Featured')).toBeChecked();
        await drawer.applyButton.click();
        await expect(drawer.root).toBeHidden();
        await expectUrl(page, '/w');
        await expect(list.heading).toHaveText('Shoes (30)');
      });

      await test.step('Close bỏ bản nháp', async () => {
        await list.filterOpenButton.click();
        await drawer.option('gender', 'women').click();
        await expect(drawer.option('gender', 'women')).toBeChecked();
        await drawer.closeButton.click();
        await expect(drawer.root).toBeHidden();
        await expectUrl(page, '/w');
        await expect(list.heading).toHaveText('Shoes (30)');
      });
    }
  );

  test(
    'TC-30 bố cục mobile',
    { tag: '@regression' },
    async ({ page, productListPage: list }, testInfo) => {
      await list.goto();
      await expect(list.heading).toHaveText('Shoes (30)');
      await expect(list.cards).toHaveCount(12);
      expect(await list.columnCount()).toBe(2);
      // Không cuộn ngang toàn trang: scrollWidth của <html> ≤ bề rộng khung nhìn
      const overflow = await page.locator('html').evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      await expect(list.sidebar.root).toHaveCount(0);
      await expect(list.filterToggle).toHaveCount(0);
      await expect(list.sortTrigger).toHaveCount(0);
      await expect(list.filterOpenButton).toBeVisible();
      await expect(list.filterOpenButton).toHaveAccessibleName('Filter');
      await expect(list.categoryLinks).toHaveText(CATEGORY_LINKS);
      await docShot(page, testInfo, '05-luoi-mobile');
    }
  );
});
