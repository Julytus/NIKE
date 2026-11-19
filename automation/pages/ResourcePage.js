import { BasePage } from './BasePage.js';

/** Trang quản trị Tài nguyên `/admin/resources` (bảng resource: tên, code, URI, module). */
export class ResourcePage extends BasePage {
  path = '/admin/resources';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Resources', exact: true });
    this.filterToggle = page.getByRole('button', { name: 'Filters', exact: true });
    this.searchInput = page.getByPlaceholder('Search by name, code, URI...');
    this.dataRows = page.locator('tbody tr');
  }

  /** Mở trang và chờ tiêu đề "Resources". */
  async open() {
    await this.goto();
    await this.heading.waitFor();
  }

  /** Lọc bảng theo tên / code / URI (ô tìm có độ trễ 400 ms). @param {string} keyword */
  async search(keyword) {
    if (!(await this.searchInput.isVisible())) await this.filterToggle.click();
    await this.searchInput.fill(keyword);
  }

  /** Dòng của tài nguyên có tên đúng `name`. @param {string} name */
  row(name) {
    return this.dataRows.filter({ has: this.page.getByText(name, { exact: true }) });
  }
}
