import { ProductCard } from './ProductCard.js';

/** Khung tìm kiếm (dialog "Tìm kiếm", testid `search-overlay`) — plan giao-dien-nike §6.4. */
export class SearchOverlay {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Tìm kiếm' });
    this.input = this.root.getByRole('searchbox', { name: 'Tìm kiếm sản phẩm' });
    this.cancelButton = this.root.getByRole('button', { name: 'Huỷ', exact: true });
    this.popularHeading = this.root.getByText('Tìm kiếm phổ biến', { exact: true });
    this.suggestionsHeading = this.root.getByText('Gợi ý sản phẩm', { exact: true });
    this.results = this.root.getByTestId('search-results');
    this.suggestions = this.root.getByTestId('search-suggestion');
    this.viewAllLink = this.root.getByRole('link', { name: /^Xem tất cả \d+ kết quả$/ });
    this.errorMessage = this.root.getByText(
      'Không tải được gợi ý. Nhấn Enter để xem tất cả kết quả.',
      { exact: true }
    );
  }

  /** Pill "Tìm kiếm phổ biến". @param {string} text */
  popularPill(text) {
    return this.root.getByRole('link', { name: text, exact: true });
  }

  /** Thẻ gợi ý thứ `index` (0-based). @param {number} index */
  suggestion(index) {
    return new ProductCard(this.suggestions.nth(index));
  }

  /** @param {string} q từ khoá đã trim */
  noResultMessage(q) {
    return this.root.getByText(`Không tìm thấy sản phẩm nào cho "${q}".`, { exact: true });
  }

  /** Gõ từ khoá (thay nội dung cũ). @param {string} q */
  async type(q) {
    await this.input.fill(q);
  }

  async submit() {
    await this.input.press('Enter');
  }

  /** Bấm vùng phủ phía dưới khung (góc dưới màn hình). */
  async clickBackdrop() {
    const size = this.page.viewportSize();
    if (!size) throw new Error('Không có viewport');
    await this.page.mouse.click(size.width / 2, size.height - 10);
  }
}
