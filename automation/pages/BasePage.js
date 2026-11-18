/**
 * Lớp cha của mọi page object: giữ `page`, đường dẫn trang và các thao tác chung.
 */
export class BasePage {
  /** Đường dẫn tương đối của trang (lớp con ghi đè). */
  path = '/';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /** Mở trang và chờ tải xong (gồm script của Vite dev). @param {string} [path] */
  async goto(path = this.path) {
    await this.page.goto(path, { waitUntil: 'load' });
  }

  /** Màn hẹp (điện thoại): thanh bên ẩn trong menu trượt. */
  isMobile() {
    const size = this.page.viewportSize();
    return !!size && size.width < 768;
  }

  /** Thông báo nổi (sonner) chứa `text`. @param {string | RegExp} text */
  toast(text) {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text });
  }
}
