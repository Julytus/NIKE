import axiosInstance from "@/lib/axios/instance";
import type {
  CheckEmailRequest,
  CheckEmailResponse,
  ShopLoginRequest,
  ShopRegisterRequest,
  ShopUserDTO
} from "@/lib/types/account";
import type { LoginResponseDTO } from "@/lib/types/auth";
import type { ApiResponse } from "@/lib/types/common";

/** POST /account/register — đăng ký tài khoản khách hàng mới. */
export async function register(req: ShopRegisterRequest): Promise<LoginResponseDTO> {
  const payload = {
    name: req.name,
    email: req.email,
    plainPassword: req.password
  };
  const res = await axiosInstance.post<ApiResponse<LoginResponseDTO>>("/account/register", payload);
  return res.data.result;
}

/** POST /user/authenticate — đăng nhập tài khoản. */
export async function loginShop(req: ShopLoginRequest): Promise<LoginResponseDTO> {
  const payload = {
    email: req.email,
    plainPassword: req.password
  };
  const res = await axiosInstance.post<ApiResponse<LoginResponseDTO>>("/user/authenticate", payload);
  return res.data.result;
}

/** GET /account/me (plan go-lut §5.2) — thông tin tài khoản đang đăng nhập ở cửa hàng. */
export async function getAccountMe(): Promise<ShopUserDTO> {
  const res = await axiosInstance.get<ApiResponse<ShopUserDTO>>("/account/me");
  return res.data.result;
}

/** POST /account/public/check-email (plan dang-nhap-nike §5.1) — email đã có tài khoản chưa (công khai). */
export async function checkEmail(email: string): Promise<CheckEmailResponse> {
  const payload: CheckEmailRequest = { email };
  const res = await axiosInstance.post<ApiResponse<CheckEmailResponse>>("/account/public/check-email", payload);
  return res.data.result;
}
