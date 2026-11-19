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

/** Body `POST /account/public/check-email` (plan dang-nhap-nike §5.1). */
export interface CheckEmailRequest {
  email: string;
}

/** `result` của check-email: `email` đã chuẩn hoá (trim + chữ thường), `exists` = đã có tài khoản. */
export interface CheckEmailResponse {
  email: string;
  exists: boolean;
}
