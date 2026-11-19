import { expect } from '@playwright/test';

/**
 * Sidebar lọc desktop (`<aside aria-label="Filters">`, testid `filter-sidebar`) — plan danh-sach-giay §6.3:
 * link danh mục + 6 nhóm lọc (testid `filter-group-<key>`), mỗi lựa chọn có testid `filter-<key>-<value>`
 * đặt trên checkbox (size: nút bật / tắt `aria-pressed`), số đếm `(n)` testid `filter-count`.
 */
export class FilterSidebar {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('filter-sidebar');
    this.counts = this.root.getByTestId('filter-count');
  }

  /** Khối nhóm lọc. @param {string} key `gender`, `kids`, `price`, `sale`, `badge`, `size` */
  group(key) {
    return this.root.getByTestId(`filter-group-${key}`);
  }

  /** Nút tiêu đề nhóm (có `aria-expanded`). @param {string} key */
  groupButton(key) {
    return this.group(key).locator('button[aria-expanded]').first();
  }

  /** Mọi nút tiêu đề nhóm theo thứ tự hiển thị. */
  groupButtons() {
    return this.root.locator('[data-testid^="filter-group-"] button[aria-expanded]');
  }

  /** Checkbox (hoặc nút size) của một lựa chọn. @param {string} key @param {string} value */
  option(key, value) {
    return this.root.getByTestId(`filter-${key}-${value}`);
  }

  /** Nút size, vd `size('40.5')`. @param {string | number} value */
  size(value) {
    return this.option('size', String(value));
  }

  /** Mọi nút size trong nhóm "Size". */
  sizeButtons() {
    return this.root.locator('[data-testid^="filter-size-"]');
  }

  /**
   * Số đếm `(n)` cạnh một lựa chọn: phần tử `filter-count` trong dòng gần nhất chứa lựa chọn đó.
   * @param {string} key
   * @param {string} value
   */
  count(key, value) {
    return this.option(key, value)
      .locator('xpath=ancestor::*[.//*[@data-testid="filter-count"]][1]')
      .getByTestId('filter-count');
  }

  /** Mở nhóm nếu đang đóng. @param {string} key */
  async openGroup(key) {
    const button = this.groupButton(key);
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  }

  /** Bấm một lựa chọn (tick / bỏ tick, bật / tắt size). @param {string} key @param {string} value */
  async toggle(key, value) {
    await this.option(key, value).click();
  }
}
