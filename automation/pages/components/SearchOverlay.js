import { ProductCard } from './ProductCard.js';

/** Khung tìm kiếm (dialog "Search", testid `search-overlay`) — plan giao-dien-nike §6.4. */
export class SearchOverlay {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('dialog', { name: 'Search' });
    this.input = this.root.getByRole('searchbox', { name: 'Search products' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel', exact: true });
    this.popularHeading = this.root.getByText('Popular Search Terms', { exact: true });
    this.suggestionsHeading = this.root.getByText('Top Suggestions', { exact: true });
    this.results = this.root.getByTestId('search-results');
    this.suggestions = this.root.getByTestId('search-suggestion');
    this.viewAllLink = this.root.getByRole('link', { name: /^View All \d+ Results?$/ });
    this.errorMessage = this.root.getByText(
      "Couldn't load suggestions. Press Enter to see all results.",
      { exact: true }
    );
  }

  /** Pill "Popular Search Terms". @param {string} text */
  popularPill(text) {
    return this.root.getByRole('link', { name: text, exact: true });
  }

  /** Thẻ gợi ý thứ `index` (0-based). @param {number} index */
  suggestion(index) {
    return new ProductCard(this.suggestions.nth(index));
  }

  /** @param {string} q từ khoá đã trim */
  noResultMessage(q) {
    return this.root.getByText(`We couldn't find anything for "${q}".`, { exact: true });
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
