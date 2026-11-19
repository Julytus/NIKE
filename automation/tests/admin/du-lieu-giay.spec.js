import { storageStateOf } from '../../data/accounts.js';
import { expect, test } from '../../fixtures/index.js';
import { docShot } from '../../utils/doc-shot.js';

/**
 * Lát `du-lieu-giay` (plan/du-lieu-giay.md §6, §9 TC-13, TC-14): resource `PRODUCT` mới
 * hiện ở các trang quản trị đã có.
 */

// Tên đổi sang tiếng Anh ở lát tieng-anh-cua-hang (V20).
const PRODUCT_RESOURCE = 'Product Management';

test.describe('Quản trị: tài nguyên sản phẩm', () => {
  test.use({ storageState: storageStateOf('admin') });

  test(
    'TC-13 tài nguyên mới hiện ở trang quản trị',
    { tag: '@smoke' },
    async ({ resourcePage }, testInfo) => {
      await resourcePage.open();
      await resourcePage.search(PRODUCT_RESOURCE);

      const row = resourcePage.row(PRODUCT_RESOURCE);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('PRODUCT');
      await expect(row).toContainText('/product/');
      await docShot(resourcePage.page, testInfo, '01-tai-nguyen-san-pham');
    }
  );

  test(
    'TC-14 ma trận phân quyền có hàng sản phẩm',
    { tag: '@regression' },
    async ({ apiAs, permissionPage }, testInfo) => {
      const admin = await apiAs('admin');
      const role = await admin.role.findByName('Customer');
      expect(role, 'chức vụ "Customer" có trong seed').toBeTruthy();

      await permissionPage.openForRole(role.id);
      await expect(permissionPage.heading).toBeVisible();
      await expect(permissionPage.resourceRow(PRODUCT_RESOURCE)).toBeVisible();
      await docShot(permissionPage.page, testInfo, '02-phan-quyen-san-pham');
    }
  );
});
