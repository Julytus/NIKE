/**
 * Hộp thoại "Size Guide" của trang chi tiết (plan chi-tiet-giay §6.5): testid `size-guide`, bảng quy đổi
 * EU / UK / US (theo giới tính) / Foot Length (cm); mỗi dòng testid `size-guide-row`, size đang chọn có
 * `data-selected="true"`.
 */
export class SizeGuideDialog {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByTestId('size-guide');
    this.title = this.root.getByRole('heading', { name: 'Size Guide', exact: true });
    this.table = this.root.getByRole('table');
    this.rows = this.root.getByTestId('size-guide-row');
    this.selectedRow = this.root.locator('[data-testid="size-guide-row"][data-selected="true"]');
    this.close = this.root.getByRole('button', { name: 'Close', exact: true });
  }

  /** Chữ các tiêu đề cột theo thứ tự. */
  columnHeaders() {
    return this.table.getByRole('columnheader').allTextContents();
  }

  /** Chữ mọi ô của mọi dòng theo thứ tự (mảng các mảng). */
  cells() {
    return this.rows.evaluateAll((els) =>
      els.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => (c.textContent ?? '').trim()))
    );
  }

  /**
   * Chữ các ô của dòng có cột EU = `eu` (vd "42", "38.5"); không có → null.
   * @param {string} eu
   */
  async row(eu) {
    return (await this.cells()).find((cells) => cells[0] === eu) ?? null;
  }

  /** Cột EU của mọi dòng theo thứ tự. */
  async euColumn() {
    return (await this.cells()).map((cells) => cells[0]);
  }
}
