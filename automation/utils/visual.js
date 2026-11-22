/* global document, window -- dùng trong page.evaluate / waitForFunction (chạy ở trình duyệt) */
import { expect, test } from '@playwright/test';

/**
 * Hạ tầng visual regression (plan kiem-thu-giao-dien §3 L1, §5.3): trình duyệt chạy trong Playwright server
 * Docker (Linux) để ảnh chuẩn ở máy Windows và trên CI giống nhau; `settle` đưa trang về trạng thái tĩnh
 * trước khi chụp; `masks` che phần thay đổi giữa các lần chạy.
 */

/** Message bỏ qua khi không có server (E1, §5.5). */
export const NO_SERVER_REASON =
  'Cần Playwright server Docker — chạy pnpm test:visual hoặc pnpm visual:server rồi đặt E2E_PW_WS';

const IMAGE_TIMEOUT_MS = 15_000;

/**
 * `connectOptions` cho spec visual: `test.use({ connectOptions: visualConnect() })`. `<loopback>` chuyển request
 * tới localhost (frontend :4500, backend :9500, MinIO :9000) của trình duyệt trong container ngược về máy chạy test.
 * Không đặt `E2E_PW_WS` thì trả `undefined` (test tự bỏ qua bằng `requireVisualServer`).
 */
export function visualConnect() {
  const wsEndpoint = process.env.E2E_PW_WS;
  return wsEndpoint ? { wsEndpoint, exposeNetwork: '<loopback>' } : undefined;
}

/** Gọi trong `beforeEach`: không có server thì bỏ qua test, không chụp bằng trình duyệt của máy. */
export function requireVisualServer() {
  test.skip(!process.env.E2E_PW_WS, NO_SERVER_REASON);
}

/**
 * Chờ trang tĩnh: mạng rảnh, font tải xong, hết skeleton / `aria-busy`, ảnh trong khung nhìn đã tải; cuộn về đầu
 * trang và bỏ focus. Ảnh quá 15 giây chưa tải thì đỏ với `Ảnh chưa tải xong: <src>`.
 * @param {import('@playwright/test').Page} page
 * @param {{ scrollTop?: boolean }} [options] `scrollTop: false` để giữ vị trí cuộn (vd trạng thái lỗi giữa trang)
 */
export async function settle(page, { scrollTop = true } = {}) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  for (const selector of ['[aria-busy="true"]', '[data-testid$="-skeleton"]']) {
    await expect(page.locator(selector).filter({ visible: true })).toHaveCount(0, {
      timeout: IMAGE_TIMEOUT_MS,
    });
  }
  if (scrollTop) {
    await page.evaluate(() => {
      const scroller = document.getElementById('app-scroll');
      if (scroller) scroller.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  }
  await waitImagesInViewport(page);
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof window.HTMLElement) el.blur();
  });
}

/**
 * Chờ mọi `<img>` nằm trong khung nhìn có `complete && naturalWidth > 0`.
 * @param {import('@playwright/test').Page} page
 */
async function waitImagesInViewport(page) {
  const pending = () =>
    page.evaluate(() =>
      [...document.images]
        .filter((img) => {
          const r = img.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.height > 0 &&
            r.bottom > 0 &&
            r.right > 0 &&
            r.top < window.innerHeight &&
            r.left < window.innerWidth
          );
        })
        .filter((img) => !(img.complete && img.naturalWidth > 0))
        .map((img) => img.currentSrc || img.src)
    );
  const deadline = Date.now() + IMAGE_TIMEOUT_MS;
  let left = await pending();
  while (left.length > 0 && Date.now() < deadline) {
    await page.waitForTimeout(200);
    left = await pending();
  }
  if (left.length > 0) throw new Error(`Ảnh chưa tải xong: ${left[0]}`);
}

/**
 * Phần luôn che khi chụp (màu `#FF00FF`): mã đơn; ở trang quản trị thì thân bảng và thanh chân bảng (số bản ghi,
 * số trang) vì test khác chạy song song có thể thêm / sửa chức vụ.
 * @param {import('@playwright/test').Page} page
 */
export function masks(page) {
  const list = [page.getByTestId('order-code')];
  if (new URL(page.url()).pathname.startsWith('/admin')) {
    list.push(
      page.locator('tbody'),
      page.locator('div:has(> [data-slot="table-container"]) + div')
    );
  }
  return list;
}
