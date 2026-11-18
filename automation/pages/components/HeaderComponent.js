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
    this.skipLink = page.getByRole('link', { name: 'Bỏ qua menu', exact: true });

    // Dải trên (desktop)
    this.jordanLink = this.root.getByRole('link', { name: 'Jordan', exact: true });
    this.findStoreLink = this.root.getByRole('link', { name: 'Tìm cửa hàng', exact: true });
    this.helpLink = this.root.getByRole('link', { name: 'Trợ giúp', exact: true });
    this.registerButton = this.root.getByTestId('header-register');
    // Desktop: nút chữ ở dải trên; mobile: nút icon cùng tên (nút còn lại bị ẩn theo màn hình)
    this.loginButton = this.root.getByRole('button', { name: 'Đăng nhập', exact: true });
    this.sessionSkeleton = this.root.getByRole('status', { name: 'Đang tải tài khoản' });

    // Thanh chính
    this.logo = this.root.getByTestId('header-logo');
    this.nav = this.root.getByRole('navigation', { name: 'Danh mục chính' });
    this.searchButton = this.root.getByRole('button', { name: 'Tìm kiếm', exact: true });
    this.favoritesLink = this.root.getByRole('link', { name: 'Yêu thích', exact: true });
    this.cartLink = this.root.getByRole('link', { name: 'Giỏ hàng', exact: true });
    this.menuButton = this.root.getByRole('button', { name: 'Menu', exact: true });
    this.megaMenu = page.getByTestId('mega-menu');

    // Menu tài khoản
    this.accountMenu = page.getByRole('menu');

    // Dải thông báo (ngoài header)
    this.announcement = page.getByTestId('announcement-bar');
    this.joinNowButton = this.announcement.getByRole('button', {
      name: 'Tham gia ngay',
      exact: true,
    });
    this.announcementDetails = this.announcement.getByRole('link', {
      name: 'Xem chi tiết',
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

  /** Nút tài khoản khi đã đăng nhập (`Xin chào, <tên>`). @param {string} name */
  accountButton(name) {
    return this.root.getByRole('button', { name: `Xin chào, ${name}`, exact: true });
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

  async openMobileMenu() {
    await this.menuButton.click();
    await expect(this.mobileMenu.root).toBeVisible();
    return this.mobileMenu;
  }

  /** Mở hộp thoại đăng nhập (desktop: dải trên; mobile: icon tài khoản). */
  async openLogin() {
    await this.loginButton.click();
  }

  /** Mở hộp thoại đăng ký (desktop: "Tham gia" ở dải trên; mobile: menu trượt → "Tham gia"). */
  async openRegister() {
    if (this.isDesktop()) {
      await this.registerButton.click();
    } else {
      const menu = await this.openMobileMenu();
      await menu.joinButton.click();
    }
  }

  /** Chưa đăng nhập: có nút "Đăng nhập" (và "Tham gia" ở desktop), không có nút "Xin chào". */
  async expectLoggedOut() {
    await expect(this.loginButton).toBeVisible();
    if (this.isDesktop()) await expect(this.registerButton).toBeVisible();
    await expect(this.root.getByRole('button', { name: /^Xin chào, / })).toHaveCount(0);
  }

  /** Cuộn vùng `#app-scroll` tới `y` (px). @param {number} y */
  async scrollTo(y) {
    await this.page.locator('#app-scroll').evaluate((el, top) => {
      el.scrollTo({ top, behavior: 'instant' });
    }, y);
  }
}
