import path from 'node:path';

/**
 * Chụp ảnh cho tài liệu chức năng khi đặt biến `E2E_DOC_SHOTS=<thư mục>`; không đặt thì bỏ qua.
 * Chỉ chụp ở project `chromium` (ảnh desktop) và `mobile-chrome` (chỉ ảnh có tên kết thúc `-mobile`,
 * để test chạy cả hai project không ghi đè ảnh desktop) để ảnh đồng nhất.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {string} name tên file không đuôi, vd `01-dang-nhap`
 */
export async function docShot(page, testInfo, name) {
  const dir = process.env.E2E_DOC_SHOTS;
  const project = testInfo.project.name;
  const allowed =
    project === 'chromium' || (project === 'mobile-chrome' && name.endsWith('-mobile'));
  if (!dir || !allowed) return;
  await page.screenshot({ path: path.resolve(dir, `${name}.png`), fullPage: false });
}
