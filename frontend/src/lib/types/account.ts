/** Tài khoản đang đăng nhập ở cửa hàng — GET /api/account/me (plan go-lut §5.2). */
export interface ShopUserDTO {
  id: number;
  /** 1 = chức vụ toàn quyền */
  isOperator: 0 | 1;
  roleId: number;
  roleName: string;
  name: string;
  email: string;
  hasPassword: 0 | 1;
  active: 0 | 1;
  firstTime: 0 | 1;
}

export interface ShopLoginRequest {
  email: string;
  password: string;
}

export interface ShopRegisterRequest {
  name: string;
  email: string;
  password: string;
}
