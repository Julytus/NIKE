import { AUTO_PREFIX } from '../utils/unique.js';

/** API Chức vụ (resource `ROLE`). */
export class RoleApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /** @param {{ keyword?: string, page?: number, limit?: number }} [query] */
  list({ keyword, page = 1, limit = 10 } = {}) {
    /** @type {Record<string, string | number>} */
    const params = { page, limit };
    if (keyword) params.keyword = keyword;
    return this.client.get('/role/list', params);
  }

  /** @param {number} id */
  get(id) {
    return this.client.get('/role/get', { id });
  }

  /**
   * Tạo mới (không có `id`) hoặc cập nhật (có `id`).
   * @param {{ id?: number, name: string, isDefault?: number, isOperator?: number }} role
   */
  update({ id, name, isDefault = 0, isOperator = 0 }) {
    return this.client.post('/role/update', { id, name, isDefault, isOperator });
  }

  /** @param {number} id */
  delete(id) {
    return this.client.post(`/role/delete/${id}`);
  }

  /**
   * Tạo nhanh một chức vụ và trả về bản ghi (khẳng định thành công).
   * @param {string} name
   */
  async create(name) {
    return this.client.expectOk(await this.update({ name }));
  }

  /**
   * Tìm theo tên chính xác, trả về bản ghi hoặc `undefined`.
   * @param {string} name
   */
  async findByName(name) {
    const page = await this.client.expectOk(await this.list({ keyword: name, limit: 50 }));
    return page.items.find((/** @type {{ name: string }} */ r) => r.name === name);
  }

  /**
   * Xoá mọi chức vụ do test sinh ra (tên bắt đầu `AUTO-`), có thể lọc thêm theo chuỗi con.
   * @param {string} [contains]
   */
  async deleteAuto(contains = AUTO_PREFIX) {
    const page = await this.client.expectOk(await this.list({ keyword: contains, limit: 200 }));
    for (const role of page.items) {
      if (role.name.startsWith(AUTO_PREFIX)) await this.delete(role.id);
    }
  }
}
