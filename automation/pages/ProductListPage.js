import { expect } from '@playwright/test';

import { BasePage } from './BasePage.js';
import { FilterDrawer } from './components/FilterDrawer.js';
import { FilterSidebar } from './components/FilterSidebar.js';
import { FooterComponent } from './components/FooterComponent.js';
import { HeaderComponent } from './components/HeaderComponent.js';
import { ProductCard } from './components/ProductCard.js';

/**
 * Trang danh sách giày `/w`, `/w/<danh mục>` (plan danh-sach-giay §6): thanh tiêu đề (h1 có số lượng,
 * "Hide Filters", "Sort By"), sidebar lọc (desktop) / hàng pill + ngăn kéo "Filter" (mobile),
 * lưới thẻ tải thêm khi cuộn, trạng thái rỗng / lỗi, "Related Categories".
 */
export class ProductListPage extends BasePage {
  path = '/w';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
    this.scroller = page.locator('#app-scroll');

    // Thanh tiêu đề
    this.heading = page.getByTestId('catalog-title');
    this.eyebrow = page.getByText('Search Results for', { exact: true });
    this.filterToggle = page.getByTestId('filter-toggle');
    this.sortTrigger = page.getByTestId('sort-trigger');

    // Link danh mục (sidebar desktop / hàng cuộn ngang mobile)
    this.categories = page.getByTestId('catalog-categories');
    this.categoryLinks = this.categories.getByRole('link');

    // Lưới
    this.grid = page.getByTestId('product-grid');
    this.cards = this.grid.getByTestId('product-card');
    this.skeletons = page.getByTestId('product-card-skeleton');
    this.emptyState = page.getByTestId('catalog-empty');
    this.clearFiltersButton = this.emptyState.getByRole('button', {
      name: 'Clear Filters',
      exact: true,
    });
    this.shopAllLink = this.emptyState.getByRole('link', { name: 'Shop All Shoes', exact: true });
    this.loadError = page.getByText("Couldn't load products.", { exact: true });
    this.loadMoreError = page.getByText("Couldn't load more products.", { exact: true });
    this.retryButton = page.getByRole('button', { name: 'Try Again', exact: true });

    // Cuối trang
    this.relatedCategories = page.getByTestId('related-categories');
    this.relatedHeading = page.getByRole('heading', {
      level: 2,
      name: 'Related Categories',
      exact: true,
    });
    this.relatedLinks = this.relatedCategories.getByRole('link');

    // Bộ lọc
    this.sidebar = new FilterSidebar(page);
    this.drawer = new FilterDrawer(page);
    this.filterOpenButton = page.getByTestId('filter-open');
  }

  /**
   * Mở trang với tham số search (giữ nguyên chuỗi, vd `{ gender: 'men,women' }`).
   * @param {string} [path]
   * @param {Record<string, string>} [search]
   */
  async goto(path = this.path, search = {}) {
    const query = new URLSearchParams(search).toString().replaceAll('%2C', ',');
    await super.goto(query ? `${path}?${query}` : path);
  }

  /** Thẻ thứ `index` (0-based). @param {number} index */
  card(index) {
    return new ProductCard(this.cards.nth(index));
  }

  /** Tên các thẻ đang hiện theo thứ tự. */
  cardNames() {
    return this.cards.getByTestId('product-name').allTextContents();
  }

  /** Link danh mục theo tên ("All Shoes", "Lifestyle"…). @param {string} name */
  categoryLink(name) {
    return this.categories.getByRole('link', { name, exact: true });
  }

  /** Pill lọc mobile. @param {string} key */
  filterPill(key) {
    return this.page.getByTestId(`filter-pill-${key}`);
  }

  /** Mở "Sort By" và chọn một kiểu. @param {string} label vd `Price: Low-High` */
  async sortBy(label) {
    await this.sortTrigger.click();
    await this.page.getByRole('menuitemradio', { name: label, exact: true }).click();
  }

  /**
   * Bấm bộ lọc trên giao diện theo thứ tự `steps` (plan kiem-thu-hoi-quy §4, §6.1). Mỗi bước `[key, value]`:
   * - `['q', từ khoá]`: tìm qua khung tìm kiếm ở header;
   * - `['category', slug]`: bấm link danh mục (giữ các bộ lọc đang có, bỏ `q`);
   * - còn lại (`gender`, `kids`, `price`, `sale`, `badge`, `size`): desktop tick trong sidebar (mở nhóm nếu
   *   đóng), mobile gom các bước liền nhau vào một lần mở ngăn kéo "Filter" → tick → "Apply".
   * Sau mỗi bước chờ URL có tham số tương ứng.
   * @param {[string, string][]} steps
   */
  async applyFilters(steps) {
    /** @type {[string, string][]} */
    let pendingDrawer = [];
    const flushDrawer = async () => {
      if (pendingDrawer.length === 0) return;
      await this.filterOpenButton.click();
      await expect(this.drawer.root).toBeVisible();
      for (const [key, value] of pendingDrawer) await this.drawer.option(key, value).click();
      await this.drawer.applyButton.click();
      await expect(this.drawer.root).toBeHidden();
      for (const [key, value] of pendingDrawer) await this.#waitParam(key, value);
      pendingDrawer = [];
    };

    for (const [key, value] of steps) {
      if (key === 'q') {
        await flushDrawer();
        await this.header.searchFor(value);
      } else if (key === 'category') {
        await flushDrawer();
        const name = await this.categories.locator(`a[href^="/w/${value}"]`).first().textContent();
        await this.categoryLink(/** @type {string} */ (name).trim()).click();
        await expect(this.page).toHaveURL((url) => url.pathname === `/w/${value}`);
      } else if (!this.header.isDesktop()) {
        pendingDrawer.push([key, value]);
      } else {
        await this.sidebar.openGroup(key);
        const option = this.sidebar.option(key, value);
        // Tick xong trang cuộn về đầu → sidebar dịch chuyển; cú bấm kế tiếp có lúc trượt (Firefox khi máy bận,
        // plan kiem-thu-hoi-quy §12) → bấm lại khi lựa chọn chưa ở trạng thái chọn (`data-state` checked / on)
        await expect(async () => {
          const state = await option.getAttribute('data-state');
          if (state !== 'checked' && state !== 'on') await option.click();
          await this.#waitParam(key, value, 2_000);
        }).toPass({ timeout: 10_000 });
      }
    }
    await flushDrawer();
  }

  /**
   * Chờ URL có `key` chứa `value` (danh sách cách nhau dấu phẩy).
   * @param {string} key @param {string} value @param {number} [timeout]
   */
  async #waitParam(key, value, timeout = undefined) {
    await expect(this.page).toHaveURL(
      (url) => (url.searchParams.get(key) ?? '').split(',').includes(value),
      { timeout }
    );
  }

  /**
   * URL hiện tại khớp bộ lọc `filter` (kiểu `catalog-filters.json`): path `/w` hoặc `/w/<category>`,
   * tham số còn lại bằng nhau, không phụ thuộc thứ tự tham số lẫn thứ tự giá trị trong danh sách.
   * @param {Record<string, string>} filter
   */
  async expectUrlFilter(filter) {
    const { category, ...rest } = filter;
    /** @param {Iterable<[string, string]>} entries */
    const norm = (entries) =>
      Object.fromEntries(
        [...entries]
          .map(([k, v]) => [
            k,
            v
              .split(',')
              .map((x) => x.trim())
              .sort()
              .join(','),
          ])
          .sort(([a], [b]) => a.localeCompare(b))
      );
    const expected = {
      path: category ? `/w/${category}` : '/w',
      params: norm(Object.entries(rest)),
    };
    await expect
      .poll(
        () => {
          const url = new URL(this.page.url());
          return { path: url.pathname, params: norm(url.searchParams.entries()) };
        },
        `URL khớp bộ lọc ${JSON.stringify(filter)}`
      )
      .toEqual(expected);
  }

  /** Đoạn trống khi tìm `q` không ra. @param {string} q */
  noResultMessage(q) {
    return this.emptyState.getByText(`We couldn't find anything for "${q}".`, { exact: true });
  }

  /** Số lượng trong h1 `... (n)`; chưa có số → null. */
  async total() {
    const text = (await this.heading.textContent()) ?? '';
    const match = text.match(/\((\d+)\)\s*$/);
    return match ? Number(match[1]) : null;
  }

  /** `scrollTop` của vùng cuộn `#app-scroll`. */
  scrollTop() {
    return this.scroller.evaluate((el) => el.scrollTop);
  }

  /** Cuộn `#app-scroll` tới `y` px. @param {number} y */
  async scrollTo(y) {
    await this.scroller.evaluate((el, top) => el.scrollTo({ top, behavior: 'instant' }), y);
  }

  /**
   * Chờ router lưu xong vị trí cuộn hiện tại của `#app-scroll` (TanStack Router ghi vào sessionStorage
   * `tsr-scroll-restoration-v1_3`, throttle 100 ms). Bấm sang trang khác trước khi lưu xong thì Back không về
   * đúng chỗ (rủi ro ghi ở plan chi-tiet-giay §12, sửa ở kiem-thu-hoi-quy §12).
   */
  async waitScrollSaved() {
    const top = Math.round(await this.scrollTop());
    await expect
      .poll(
        () =>
          this.page.evaluate((y) => {
            const raw = sessionStorage.getItem('tsr-scroll-restoration-v1_3');
            const state = raw ? JSON.parse(raw) : {};
            return Object.values(state).some((byElement) =>
              Object.values(/** @type {Record<string, { scrollY: number }>} */ (byElement)).some(
                (pos) => Math.abs(Math.round(pos.scrollY) - y) <= 1
              )
            );
          }, top),
        { message: `router đã lưu vị trí cuộn ${top}` }
      )
      .toBe(true);
  }

  /** Cuộn tới đáy vùng cuộn. */
  async scrollToBottom() {
    await this.scroller.evaluate((el) =>
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
    );
  }

  /** Cuộn tới khi số thẻ = số trong h1 (tải hết các trang). */
  async loadAll() {
    await expect(this.heading).toHaveText(/\(\d+\)$/);
    const total = /** @type {number} */ (await this.total());
    await expect(async () => {
      await this.scrollToBottom();
      expect(await this.cards.count()).toBe(total);
    }).toPass({ timeout: 20_000 });
  }

  /** Số cột của lưới: số toạ độ x khác nhau của các thẻ cùng hàng với thẻ đầu. */
  async columnCount() {
    const boxes = await this.cards.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top) };
      })
    );
    if (boxes.length === 0) return 0;
    const firstY = boxes[0].y;
    return new Set(boxes.filter((b) => Math.abs(b.y - firstY) < 2).map((b) => b.x)).size;
  }
}
