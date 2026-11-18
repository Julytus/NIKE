import { BasePage } from './BasePage.js';
import { ShopLoginDialog } from './components/ShopLoginDialog.js';
import { ShopRegisterDialog } from './components/ShopRegisterDialog.js';

/**
 * Trang cửa hàng `/` (tạm thời là "Cửa hàng đang được nâng cấp" — lát `go-lut`):
 * header (đăng nhập / đăng ký / menu tài khoản), nội dung, footer.
 */
export class ShopHomePage extends BasePage {
  path = '/';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: 'Cửa hàng đang được nâng cấp' });
    this.description = page.getByText('Trang bán giày sẽ sớm ra mắt.', { exact: true });
    this.footer = page.getByRole('contentinfo');
    this.header = page.getByRole('banner');
    this.loginButton = this.header.getByRole('button', { name: 'Đăng nhập', exact: true });
    this.registerButton = this.header.getByRole('button', { name: 'Đăng ký', exact: true });
    this.loginDialog = new ShopLoginDialog(page);
    this.registerDialog = new ShopRegisterDialog(page);
    this.accountMenu = page.getByRole('menu');
  }

  /** Nút mở menu tài khoản (tên đọc "Tài khoản <tên>"). @param {string} name */
  accountButton(name) {
    return this.header.getByRole('button', { name: `Tài khoản ${name}` });
  }

  /** Mục trong menu tài khoản đang mở. @param {string} name */
  menuItem(name) {
    return this.accountMenu.getByRole('menuitem', { name, exact: true });
  }

  /** Đăng nhập qua hộp thoại của cửa hàng. @param {{ email: string, password: string }} account */
  async login(account) {
    await this.loginButton.click();
    await this.loginDialog.login(account);
  }
}
