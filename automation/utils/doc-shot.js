import path from 'node:path';

/**
 * Chụp ảnh cho tài liệu chức năng khi đặt biến `E2E_DOC_SHOTS=<thư mục>`; không đặt thì bỏ qua.
 * Chỉ chụp ở project `chromium` để ảnh đồng nhất.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {string} name tên file không đuôi, vd `01-dang-nhap`
 */
export async function docShot(page, testInfo, name) {
  const dir = process.env.E2E_DOC_SHOTS;
  if (!dir || testInfo.project.name !== 'chromium') return;
  await page.screenshot({ path: path.resolve(dir, `${name}.png`), fullPage: false });
}
