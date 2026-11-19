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
