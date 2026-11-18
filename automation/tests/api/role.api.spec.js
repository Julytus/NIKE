import { expect, test } from '../../fixtures/index.js';
import { uniqueName } from '../../utils/unique.js';

test.describe('API Chức vụ', () => {
  test('TC-11 phân quyền chức vụ: không quyền 403, id không tồn tại 404', { tag: '@regression' }, async ({ apiAs }) => {
    const noaccess = await apiAs('noaccess');
    await noaccess.client.expectError(await noaccess.role.list(), 403, 'Không có quyền truy cập');

    const admin = await apiAs('admin');
    await admin.client.expectError(await admin.role.get(999999), 404, 'Dữ liệu không tồn tại');
  });

  test('TC-11b vòng đời chức vụ qua API: tạo, xem, sửa, xoá', { tag: '@regression' }, async ({ apiAs }) => {
    const admin = await apiAs('admin');
    const name = uniqueName('api');

    const created = await admin.role.create(name);
    expect(created).toMatchObject({ name, isDefault: 0, isOperator: 0 });
    expect(created.id).toBeGreaterThan(0);

    try {
      const got = await admin.client.expectOk(await admin.role.get(created.id));
      expect(got.name).toBe(name);

      const list = await admin.client.expectOk(await admin.role.list({ keyword: name }));
      expect(list.items.map((/** @type {{ id: number }} */ r) => r.id)).toContain(created.id);

      const renamed = `${name}-sua`;
      const updated = await admin.client.expectOk(await admin.role.update({ id: created.id, name: renamed }));
      expect(updated.name).toBe(renamed);
    } finally {
      await admin.client.expectOk(await admin.role.delete(created.id));
    }
    await admin.client.expectError(await admin.role.get(created.id), 404, 'Dữ liệu không tồn tại');
  });
});
