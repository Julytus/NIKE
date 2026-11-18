/**
 * Giải mã phần payload của JWT (không kiểm chữ ký — chỉ để đọc thông tin trong test).
 * Backend đặt thông tin người dùng ở claim `user` dạng chuỗi JSON (`{ id, roleId, roles, ... }`).
 * @param {string} token
 * @returns {Record<string, any>}
 */
export function decodeJwt(token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  if (typeof payload.user === 'string') payload.user = JSON.parse(payload.user);
  return payload;
}
