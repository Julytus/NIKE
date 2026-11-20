import { expect } from '@playwright/test';

import { MobileMenu } from './MobileMenu.js';
import { SearchOverlay } from './SearchOverlay.js';

/** Bề rộng tối thiểu của "desktop" (Tailwind `lg`) — plan giao-dien-nike §6. */
export const DESKTOP_MIN_WIDTH = 1024;

/**
 * Header cửa hàng (landmark banner): dải trên (desktop), thanh chính, mega menu, nút tài khoản,
 * cùng dải thông báo nằm ngay dưới header — plan giao-dien-nike §6.1, §6.2.
 */
export class HeaderComponent {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('banner');
    this.skipLink = page.getByRole('link', { name: 'Skip to main content', exact: true });

    // Dải trên (desktop)
    this.jordanLink = this.root.getByRole('link', { name: 'Jordan', exact: true });
    this.findStoreLink = this.root.getByRole('link', { name: 'Find a Store', exact: true });
    this.helpLink = this.root.getByRole('link', { name: 'Help', exact: true });
    this.registerButton = this.root.getByTestId('header-register');
    // Desktop: link chữ ở dải trên; mobile: link icon cùng tên (link còn lại bị ẩn theo màn hình) —
    // lát dang-nhap-nike §6.5: mọi lối vào là link tới `/signin?redirect=…`, không còn hộp thoại
    this.loginButton = this.root.getByRole('link', { name: 'Sign In', exact: true });
    this.sessionSkeleton = this.root.getByRole('status', { name: 'Loading account' });

    // Thanh chính
    this.logo = this.root.getByTestId('header-logo');
    this.nav = this.root.getByRole('navigation', { name: 'Main menu' });
    this.searchButton = this.root.getByRole('button', { name: 'Search', exact: true });
    this.favoritesLink = this.root.getByRole('link', { name: 'Favourites', exact: true });
    // Tên link túi: "Bag" (giỏ trống) hoặc "Bag, 2 items" — lát gio-hang §6.1
    this.cartLink = this.root.getByRole('link', { name: /^Bag(, \d+ items?)?$/ });
    this.cartCount = this.root.getByTestId('header-cart-count');
    this.menuButton = this.root.getByRole('button', { name: 'Menu', exact: true });
    this.megaMenu = page.getByTestId('mega-menu');

    // Menu tài khoản
    this.accountMenu = page.getByRole('menu');

    // Dải thông báo (ngoài header)
    this.announcement = page.getByTestId('announcement-bar');
    this.joinNowButton = this.announcement.getByRole('link', {
      name: 'Join Us',
      exact: true,
    });
    this.announcementDetails = this.announcement.getByRole('link', {
      name: 'Learn More',
      exact: true,
    });

    this.search = new SearchOverlay(page);
    this.mobileMenu = new MobileMenu(page);
  }

  isDesktop() {
    const size = this.page.viewportSize();
    return !size || size.width >= DESKTOP_MIN_WIDTH;
  }

  /** Link mục chính trong nav desktop. @param {string} name */
  navLink(name) {
    return this.nav.getByRole('link', { name, exact: true });
  }

  /** Tiêu đề cột trong mega menu. @param {string} name */
  megaColumn(name) {
    return this.megaMenu.getByText(name, { exact: true });
  }

  /** @param {string} name */
  megaLink(name) {
    return this.megaMenu.getByRole('link', { name, exact: true });
  }

  /** Rê chuột vào mục nav và chờ mega menu hiện. @param {string} name */
  async hoverNav(name) {
    await this.navLink(name).hover();
    await expect(this.megaMenu).toBeVisible();
  }

  /** Nút tài khoản khi đã đăng nhập (`Hi, <name>`). @param {string} name */
  accountButton(name) {
    return this.root.getByRole('button', { name: `Hi, ${name}`, exact: true });
  }

  /** Mục trong menu tài khoản đang mở. @param {string} name */
  menuItem(name) {
    return this.accountMenu.getByRole('menuitem', { name, exact: true });
  }

  async openSearch() {
    await this.searchButton.click();
    await expect(this.search.root).toBeVisible();
    return this.search;
  }

  /**
   * Tìm từ khoá qua khung tìm kiếm ở header (desktop + mobile): mở khung, gõ, Enter, chờ tới `/w?q=…`.
   * (Tên `searchFor` vì `search` đã là khung `SearchOverlay`.)
   * @param {string} q
   */
  async searchFor(q) {
    const overlay = await this.openSearch();
    await overlay.type(q);
    await overlay.submit();
    await expect(this.page).toHaveURL(
      (url) => url.pathname === '/w' && url.searchParams.get('q') === q.trim()
    );
    await expect(overlay.root).toBeHidden();
  }

  async openMobileMenu() {
    await this.menuButton.click();
    await expect(this.mobileMenu.root).toBeVisible();
    return this.mobileMenu;
  }

  /** Tới trang `/signin` (desktop: "Sign In" ở dải trên; mobile: icon tài khoản). */
  async openLogin() {
    await this.loginButton.click();
    await expect(this.page).toHaveURL(/\/signin(\?|$)/);
  }

  /** Tới trang `/signin` qua "Join Us" (desktop: dải trên; mobile: menu trượt → "Join Us"). */
  async openRegister() {
    if (this.isDesktop()) {
      await this.registerButton.click();
    } else {
      const menu = await this.openMobileMenu();
      await menu.joinButton.click();
    }
    await expect(this.page).toHaveURL(/\/signin(\?|$)/);
  }

  /** Chưa đăng nhập: có nút "Sign In" (và "Join Us" ở desktop), không có nút "Hi, …". */
  async expectLoggedOut() {
    await expect(this.loginButton).toBeVisible();
    if (this.isDesktop()) await expect(this.registerButton).toBeVisible();
    await expect(this.root.getByRole('button', { name: /^Hi, / })).toHaveCount(0);
  }

  /** Cuộn vùng `#app-scroll` tới `y` (px). @param {number} y */
  async scrollTo(y) {
    await this.page.locator('#app-scroll').evaluate((el, top) => {
      el.scrollTo({ top, behavior: 'instant' });
    }, y);
  }
}
