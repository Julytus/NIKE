import { BasePage } from './BasePage.js';
import { FooterComponent } from './components/FooterComponent.js';

/** Trang thông tin tĩnh `/thong-tin/$trang` (plan giao-dien-nike §6.5). */
export class InfoPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.main = page.locator('#shop-main');
    this.footer = new FooterComponent(page);
  }

  /** @param {string} slug */
  async open(slug) {
    await this.goto(`/thong-tin/${slug}`);
  }
}
