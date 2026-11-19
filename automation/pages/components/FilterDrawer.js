/**
 * Ngăn kéo lọc mobile (dialog "Filter", testid `filter-drawer`) — plan danh-sach-giay §6.6:
 * nhóm "Sort By" (radio) + 6 nhóm lọc luôn mở (cùng testid lựa chọn với sidebar, không số đếm),
 * đáy có "Clear (n)" / "Apply", góc trên nút "Close".
 */
export class FilterDrawer {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Filter' });
    this.heading = this.root.getByRole('heading', { level: 2, name: 'Filter', exact: true });
    this.closeButton = this.root.getByRole('button', { name: 'Close', exact: true });
    this.clearButton = this.root.getByRole('button', { name: /^Clear( \(\d+\))?$/ });
    this.applyButton = this.root.getByRole('button', { name: 'Apply', exact: true });
    this.counts = this.root.getByTestId('filter-count');
  }

  /** Radio sắp xếp. @param {string} label vd `Price: Low-High` */
  sortOption(label) {
    return this.root.getByRole('radio', { name: label, exact: true });
  }

  /** Khối nhóm lọc. @param {string} key */
  group(key) {
    return this.root.getByTestId(`filter-group-${key}`);
  }

  /** Checkbox (hoặc nút size) của một lựa chọn. @param {string} key @param {string} value */
  option(key, value) {
    return this.root.getByTestId(`filter-${key}-${value}`);
  }
}
