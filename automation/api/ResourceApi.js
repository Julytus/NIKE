/** API tài nguyên phân quyền (resource) và module. Chỉ phần đọc cần cho kiểm thử. */
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
}
