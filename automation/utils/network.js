/**
 * Hàm dùng chung cho network mocking (plan kiem-thu-hoi-quy §8b bước 1). Trước đây mỗi spec tự chép
 * `fail500` / `delay` / mẫu URL API; gom về đây để mọi spec dùng cùng một cách giả lập.
 *
 * Handler trả về từ các hàm dưới đây dùng trực tiếp cho `page.route(pattern, handler)`.
 */

/** @typedef {import('@playwright/test').Route} Route */
/** @typedef {import('@playwright/test').Page} Page */

/** Thoát ký tự đặc biệt của RegExp. @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * RegExp khớp request tới `…/api<path>` (có hoặc không có query), vd `apiPath('/product/public/list')`.
 * Không khớp đường dẫn dài hơn (`/product/public/list-x`).
 * @param {string} path đường dẫn API bắt đầu bằng `/`
 */
export const apiPath = (path) => new RegExp(`/api${escapeRe(path)}(\\?|$)`);

/** Mọi request API của backend (`…/api/…`), dùng cho chậm toàn tuyến / HAR. */
export const ANY_API = /\/api\//;

/** Body lỗi giả lập (cùng dạng `ErrorResponse` của backend). */
export const SIMULATED_ERROR = Object.freeze({ code: 500, message: 'Simulated error' });

/** @param {number} ms */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Handler: trả 500 với body `SIMULATED_ERROR`. @param {Route} route */
export const fail500 = (route) => route.fulfill({ status: 500, json: SIMULATED_ERROR });

/** Handler: cắt request như mất mạng (`net::ERR_FAILED`). @param {Route} route */
export const abortRoute = (route) => route.abort('failed');

/**
 * Handler: chờ `ms` rồi cho request đi tiếp tới backend thật. Dùng `fallback()` để handler khác
 * (đăng ký trước, vd `failOnce`) vẫn được gọi sau khi trễ.
 * @param {number} ms
 */
export const delayed = (ms) => async (/** @type {Route} */ route) => {
  await sleep(ms);
  await route.fallback();
};

/**
 * Handler: trả lỗi `status` cho **lần đầu** (hoặc `times` lần đầu), các lần sau cho đi tiếp.
 * `handler.calls` đếm số request đã đi qua handler (kể cả lần bị lỗi).
 * @param {number} [status]
 * @param {unknown} [body]
 * @param {{ times?: number }} [options]
 */
export function failOnce(status = 500, body = undefined, { times = 1 } = {}) {
  const json = body ?? {
    code: status,
    message: status === 500 ? SIMULATED_ERROR.message : 'Error',
  };
  const handler = Object.assign(
    async (/** @type {Route} */ route) => {
      handler.calls += 1;
      if (handler.calls <= times) await route.fulfill({ status, json });
      else await route.fallback();
    },
    { calls: 0 }
  );
  return handler;
}

/**
 * Đếm request của trang khớp `pattern` (theo URL đầy đủ), tính từ lúc gọi. Có `method` thì chỉ đếm
 * method đó. Trả object có `count` (getter) và `urls`.
 * @param {Page} page
 * @param {RegExp} pattern
 * @param {{ method?: string }} [options]
 */
export function countRequests(page, pattern, { method } = {}) {
  /** @type {string[]} */
  const urls = [];
  page.on('request', (req) => {
    if (pattern.test(req.url()) && (!method || req.method() === method)) urls.push(req.url());
  });
  return {
    urls,
    get count() {
      return urls.length;
    },
  };
}

/** Ghi lỗi JS (`pageerror`) của trang, tính từ lúc gọi. @param {Page} page */
export function collectPageErrors(page) {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
