/* global getComputedStyle -- dùng trong locator.evaluate (chạy ở trình duyệt) */
import { BasePage } from './BasePage.js';
import { AddedToBagDialog } from './components/AddedToBagDialog.js';
import { FooterComponent } from './components/FooterComponent.js';
import { HeaderComponent } from './components/HeaderComponent.js';
import { ProductCard } from './components/ProductCard.js';
import { SizeGuideDialog } from './components/SizeGuideDialog.js';

/**
 * Trang chi tiết giày `/t/<slug>` (plan chi-tiet-giay §6): gallery 5 ảnh (kéo sang bên, không phóng to) + ảnh nhỏ, cột thông tin
 * (nhãn, tên, giá, cảnh báo tồn kho, lưới size, "Add to Bag", mô tả, accordion giao hàng),
 * "You Might Also Like"; trạng thái đang tải / không tìm thấy / lỗi.
 */
export class ProductDetailPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.footer = new FooterComponent(page);
    this.scroller = page.locator('#app-scroll');
    this.main = page.getByRole('main');

    // Thông tin chính (§6.4)
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = page.getByTestId('pdp-subtitle');
    this.badge = page.getByTestId('pdp-badge');
    this.priceBlock = page.getByTestId('pdp-price-block');
    this.price = this.priceBlock.getByTestId('product-price');
    this.originalPrice = this.priceBlock.locator('s');
    this.discount = page.getByTestId('pdp-discount');

    // Gallery + ảnh nhỏ (§6.2, §6.4 mục 4)
    this.gallery = page.getByTestId('pdp-gallery');
    this.galleryImages = this.gallery.getByTestId('pdp-gallery-image');
    this.prevImage = page.getByTestId('pdp-gallery-prev');
    this.nextImage = page.getByTestId('pdp-gallery-next');
    this.thumbnailGroup = page.getByRole('group', { name: 'Product thumbnails' });
    this.thumbnails = this.thumbnailGroup.getByTestId('pdp-thumbnail');

    // Size, nút chính, cảnh báo (§6.4 mục 5 → 9)
    this.lowStock = page.getByTestId('pdp-low-stock');
    this.sizeLabel = page.locator('#pdp-size-label');
    this.sizeGuideButton = page.getByTestId('pdp-size-guide');
    this.sizeGrid = page.getByTestId('pdp-size-grid');
    this.sizes = this.sizeGrid.getByRole('radio');
    this.sizeError = page.getByTestId('pdp-size-error');
    this.addToBag = page.getByTestId('pdp-add-to-bag');
    // Lát gio-hang §6.2, §6.3: lỗi đã đủ số lượng + popup "Added to Bag"
    this.addError = page.getByTestId('pdp-add-error');
    this.addedToBag = new AddedToBagDialog(page);

    // Mô tả + accordion (§6.4 mục 10, 11)
    this.description = page.getByTestId('pdp-description');
    this.deliveryToggle = page.getByRole('button', {
      name: 'Free Delivery and Returns',
      exact: true,
    });
    this.deliveryPanel = page.getByTestId('pdp-delivery');

    // "You Might Also Like" (§6.6)
    this.related = page.getByTestId('related-products');
    this.relatedHeading = this.related.getByRole('heading', {
      name: 'You Might Also Like',
      exact: true,
    });
    this.relatedCardList = this.related.getByTestId('product-card');
    this.relatedSkeletons = this.related.getByTestId('product-card-skeleton');
    this.relatedNext = this.related.getByRole('button', { name: 'Next products', exact: true });
    this.relatedPrev = this.related.getByRole('button', { name: 'Previous products', exact: true });
    this.relatedError = this.related.getByText("Couldn't load recommendations.", { exact: true });
    this.relatedRetry = this.related.getByRole('button', { name: 'Try Again', exact: true });

    // Trạng thái trang (§6.7 → §6.9)
    this.skeleton = page.getByTestId('pdp-skeleton');
    this.notFound = page.getByTestId('pdp-not-found');
    this.loadError = page.getByText("Couldn't load this product.", { exact: true });
    this.retryButton = page.getByRole('button', { name: 'Try Again', exact: true });

    this.sizeGuide = new SizeGuideDialog(page);
  }

  /** Mở `/t/<slug>`. @param {string} slug */
  async goto(slug) {
    await super.goto(`/t/${slug}`);
  }

  /** Nút ảnh lớn thứ `n` (1-based). @param {number} n */
  galleryImage(n) {
    return this.galleryImages.nth(n - 1);
  }

  /** Ảnh nhỏ "Show image n" (1-based). @param {number} n */
  thumbnail(n) {
    return this.thumbnailGroup.getByRole('button', { name: `Show image ${n}`, exact: true });
  }

  /** Chỉ số 1–5 của ảnh nhỏ đang `aria-current="true"`; không có → 0. */
  async currentImage() {
    const flags = await this.thumbnails.evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-current') === 'true')
    );
    return flags.indexOf(true) + 1;
  }

  /**
   * Ô size theo giá trị EU (vd 42, 40.5, "38.5") — testid `pdp-size-<giá trị không có .0>`.
   * @param {number | string} value
   */
  size(value) {
    return this.page.getByTestId(`pdp-size-${Number(value)}`);
  }

  /**
   * Chọn size theo nhãn (vd "EU 42") rồi bấm "Add to Bag" (lát gio-hang §6.2).
   * @param {string} label
   */
  async addSize(label) {
    await this.sizeByLabel(label).click();
    await this.addToBag.click();
  }

  /** Ô size theo tên radio (vd "EU 42"). @param {string} label */
  sizeByLabel(label) {
    return this.sizeGrid.getByRole('radio', { name: label, exact: true });
  }

  /** Thẻ thứ `index` (0-based) của "You Might Also Like". @param {number} index */
  relatedCard(index) {
    return new ProductCard(this.relatedCardList.nth(index));
  }

  /** Tên các thẻ "You Might Also Like" theo thứ tự. */
  relatedNames() {
    return this.relatedCardList.getByTestId('product-name').allTextContents();
  }

  /** Số cột của lưới size: số toạ độ x khác nhau của các ô. */
  async sizeColumnCount() {
    const xs = await this.sizes.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left))
    );
    return new Set(xs).size;
  }

  /** `scrollTop` của vùng cuộn `#app-scroll`. */
  scrollTop() {
    return this.scroller.evaluate((el) => el.scrollTop);
  }

  /**
   * Trạng thái cuộn của dải ảnh: phần tử cuộn ngang là chính `pdp-gallery` hoặc con đầu tiên có
   * `overflow-x: auto | scroll`.
   */
  galleryScroll() {
    return this.gallery.evaluate((root) => {
      const isScroller = (/** @type {Element} */ el) =>
        ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
      const el = isScroller(root) ? root : [...root.querySelectorAll('*')].find(isScroller);
      if (!el) throw new Error('Không thấy dải cuộn ngang trong pdp-gallery');
      return {
        scrollLeft: el.scrollLeft,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      };
    });
  }

  /** Cuộn dải ảnh tới `left` px (không hiệu ứng). @param {number} left */
  scrollGalleryTo(left) {
    return this.gallery.evaluate((root, x) => {
      const isScroller = (/** @type {Element} */ el) =>
        ['auto', 'scroll'].includes(getComputedStyle(el).overflowX);
      const el = isScroller(root) ? root : [...root.querySelectorAll('*')].find(isScroller);
      el?.scrollTo({ left: x, behavior: 'instant' });
    }, left);
  }

  /**
   * Kéo dải ảnh bằng chuột: giữ ở giữa khung gallery, kéo `dx` px (âm = sang trái → ảnh sau) rồi thả (§6.2).
   * @param {number} dx
   */
  async dragGallery(dx) {
    const box = /** @type {import('@playwright/test').BoundingBox} */ (await this.gallery.boundingBox());
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(box.height, this.page.viewportSize()?.height ?? box.height) / 2;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + dx, y, { steps: 12 });
    await this.page.mouse.up();
  }

  /** Bề rộng một ảnh của dải (px). */
  async galleryImageWidth() {
    const box = await this.galleryImage(1).boundingBox();
    return box?.width ?? 0;
  }

  /**
   * Tỉ lệ bề rộng ảnh `n` (1-based) đang thấy trong khung gallery (0 → 1).
   * @param {number} n
   */
  galleryVisibleFraction(n) {
    return this.gallery.evaluate((root, index) => {
      const frame = root.getBoundingClientRect();
      const img = root.querySelectorAll('[data-testid="pdp-gallery-image"]')[index - 1];
      if (!img) return 0;
      const r = img.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.right, frame.right) - Math.max(r.left, frame.left));
      return r.width ? visible / r.width : 0;
    }, n);
  }
}
