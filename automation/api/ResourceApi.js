/** API tài nguyên phân quyền (resource) và module: phần đọc + ghi cần cho kiểm thử. */
export class ResourceApi {
  /** @param {import('./ApiClient.js').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /** @param {{ page?: number, limit?: number }} [query] */
  list({ page = 1, limit = 200 } = {}) {
    return this.client.get('/resource/list', { page, limit });
  }

  /** @param {{ page?: number, limit?: number }} [query] */
  listModules({ page = 1, limit = 200 } = {}) {
    return this.client.get('/module/list', { page, limit });
  }

  /**
   * Tạo mới (không có `id`) hoặc cập nhật tài nguyên — gửi nguyên body.
   * @param {{ id?: number, name?: string, code?: string, uri?: string, description?: string, actions?: string }} body
   */
  update(body) {
    return this.client.post('/resource/update', body);
  }

  /** @param {number} id */
  delete(id) {
    return this.client.post(`/resource/delete/${id}`);
  }

  /**
   * Tạo mới (không có `id`) hoặc cập nhật module — gửi nguyên body.
   * @param {{ id?: number, name?: string, code?: string, description?: string }} body
   */
  updateModule(body) {
    return this.client.post('/module/update', body);
  }
}
