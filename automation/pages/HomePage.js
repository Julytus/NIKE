import { BasePage } from './BasePage.js';
import { FooterComponent } from './components/FooterComponent.js';
import { HeaderComponent } from './components/HeaderComponent.js';
import { ProductCard } from './components/ProductCard.js';
import { ShopLoginDialog } from './components/ShopLoginDialog.js';
import { ShopRegisterDialog } from './components/ShopRegisterDialog.js';

/**
 * Trang chủ cửa hàng `/` (plan giao-dien-nike §6.6): hero, "Mới về", khối Jordan, "Mua theo danh mục",
 * cùng header / footer / hộp thoại đăng nhập – đăng ký dùng chung mọi trang cửa hàng.
 */
export class HomePage extends BasePage {
  path = '/';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
    this.loginDialog = new ShopLoginDialog(page);
    this.registerDialog = new ShopRegisterDialog(page);
    this.main = page.locator('#shop-main');

    this.hero = page.getByTestId('home-hero');
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Bước vào mùa mới' });
    this.shopNowLink = this.hero.getByRole('link', { name: 'Mua ngay', exact: true });
    this.allShoesLink = this.hero.getByRole('link', { name: 'Xem tất cả giày', exact: true });

    this.newArrivals = page.getByTestId('home-new-arrivals');
    this.newArrivalCards = this.newArrivals.getByTestId('product-card');
    this.newArrivalsViewAll = this.newArrivals.getByRole('link', {
      name: 'Xem tất cả',
      exact: true,
    });
    this.prevButton = this.newArrivals.getByRole('button', { name: 'Xem sản phẩm trước' });
    this.nextButton = this.newArrivals.getByRole('button', { name: 'Xem sản phẩm tiếp theo' });
    this.newArrivalsError = this.newArrivals.getByText('Không tải được sản phẩm mới.', {
      exact: true,
    });
    this.newArrivalsRetry = this.newArrivals.getByRole('button', { name: 'Thử lại', exact: true });

    this.jordan = page.getByTestId('home-jordan');
    this.shopJordanLink = this.jordan.getByRole('link', { name: 'Mua Jordan', exact: true });

    this.categories = page.getByTestId('home-categories');
    this.categoryTiles = this.categories.getByTestId('category-tile');
    this.categoriesError = this.categories.getByText('Không tải được danh mục.', { exact: true });
    this.categoriesRetry = this.categories.getByRole('button', { name: 'Thử lại', exact: true });
  }

  /** Thẻ thứ `index` (0-based) trong dải "Mới về". @param {number} index */
  newArrivalCard(index) {
    return new ProductCard(this.newArrivalCards.nth(index));
  }

  /** Ô danh mục theo tên. @param {string} name */
  categoryTile(name) {
    return this.categoryTiles.filter({ hasText: name });
  }
}
