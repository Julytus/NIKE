import { BasePage } from './BasePage.js';
import { FooterComponent } from './components/FooterComponent.js';
import { HeaderComponent } from './components/HeaderComponent.js';
import { ProductCard } from './components/ProductCard.js';

/**
 * Trang chủ cửa hàng `/` (plan giao-dien-nike §6.6): hero, "Just In", khối Jordan, "Shop by Category",
 * cùng header / footer dùng chung mọi trang cửa hàng (đăng nhập / đăng ký ở trang `/signin` — `SignInPage`).
 */
export class HomePage extends BasePage {
  path = '/';

  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
    this.main = page.locator('#shop-main');

    this.hero = page.getByTestId('home-hero');
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Step Into the New Season' });
    this.shopNowLink = this.hero.getByRole('link', { name: 'Shop Now', exact: true });
    this.allShoesLink = this.hero.getByRole('link', { name: 'Shop All Shoes', exact: true });

    this.newArrivals = page.getByTestId('home-new-arrivals');
    this.newArrivalCards = this.newArrivals.getByTestId('product-card');
    this.newArrivalsViewAll = this.newArrivals.getByRole('link', {
      name: 'Shop All',
      exact: true,
    });
    this.prevButton = this.newArrivals.getByRole('button', { name: 'Previous products' });
    this.nextButton = this.newArrivals.getByRole('button', { name: 'Next products' });
    this.newArrivalsError = this.newArrivals.getByText("Couldn't load new arrivals.", {
      exact: true,
    });
    this.newArrivalsRetry = this.newArrivals.getByRole('button', {
      name: 'Try Again',
      exact: true,
    });

    this.jordan = page.getByTestId('home-jordan');
    this.shopJordanLink = this.jordan.getByRole('link', { name: 'Shop Jordan', exact: true });

    this.categories = page.getByTestId('home-categories');
    this.categoryTiles = this.categories.getByTestId('category-tile');
    this.categoriesError = this.categories.getByText("Couldn't load categories.", { exact: true });
    this.categoriesRetry = this.categories.getByRole('button', { name: 'Try Again', exact: true });
  }

  /** Thẻ thứ `index` (0-based) trong dải "Just In". @param {number} index */
  newArrivalCard(index) {
    return new ProductCard(this.newArrivalCards.nth(index));
  }

  /** Ô danh mục theo tên. @param {string} name */
  categoryTile(name) {
    return this.categoryTiles.filter({ hasText: name });
  }
}
