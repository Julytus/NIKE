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
    // Sidebar dính + header ẩn / hiện khi cuộn: cú bấm đầu có lúc trượt (WebKit / Firefox khi máy bận,
    // plan kiem-thu-hoi-quy §12) → bấm lại tới khi nhóm mở
    await expect(async () => {
      if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: 2_000 });
    }).toPass({ timeout: 10_000 });
  }

  /** Bấm một lựa chọn (tick / bỏ tick, bật / tắt size). @param {string} key @param {string} value */
  async toggle(key, value) {
    const option = this.option(key, value);
    const before = await option.getAttribute('data-state');
    // Bấm xong trang cuộn về đầu → sidebar dịch chuyển, cú bấm kế tiếp có lúc trượt (WebKit / Firefox khi máy
    // bận, plan kiem-thu-hoi-quy §12) → bấm lại khi trạng thái (`data-state`) chưa đổi
    await expect(async () => {
      if ((await option.getAttribute('data-state')) === before) await option.click();
      await expect(option).not.toHaveAttribute('data-state', /** @type {string} */ (before), {
        timeout: 2_000,
      });
    }).toPass({ timeout: 10_000 });
  }
}
