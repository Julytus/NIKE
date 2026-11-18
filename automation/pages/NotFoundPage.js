import { BasePage } from './BasePage.js';

/** Trang "không tìm thấy" (404) dùng chung của frontend. */
export class NotFoundPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.message = page.getByText('Trang bạn đang tìm kiếm không tồn tại.', { exact: true });
  }
}
