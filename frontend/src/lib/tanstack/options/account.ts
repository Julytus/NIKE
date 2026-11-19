import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { checkEmail, getAccountMe, loginShop, register } from "@/lib/axios/account";
import { logoutRemote } from "@/lib/axios/auth";
import { useAuthStore } from "@/lib/stores/auth";
import { useShopSession } from "@/lib/stores/shop-session";
import { queryClient } from "@/lib/tanstack/query-client";
import type { ShopLoginRequest, ShopRegisterRequest, ShopUserDTO } from "@/lib/types/account";
import type { LoginResponseDTO } from "@/lib/types/auth";

/** Cache phụ thuộc người đăng nhập: xoá khi đổi tài khoản để không lộ quyền của người trước. */
const USER_SCOPED_KEYS = [["account-me"], ["permission-resource"]];
const clearUserQueries = () => USER_SCOPED_KEYS.forEach((queryKey) => queryClient.removeQueries({ queryKey }));

/** GET /account/me — query lấy thông tin tài khoản hiện tại khi có token. */
export const accountMeQueryOptions = queryOptions({
  queryKey: ["account-me"],
  queryFn: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;
    return getAccountMe();
  },
  retry: false,
  staleTime: 0
});

/** Lưu token rồi nạp `account/me` vào phiên cửa hàng. */
async function startSession(res: LoginResponseDTO): Promise<ShopUserDTO> {
  clearUserQueries();
  useAuthStore.getState().set({
    accessToken: res.token,
    refreshToken: res.refreshToken,
    userId: res.userId,
    remember: true
  });
  const user = await getAccountMe();
  useShopSession.getState().setUser(user);
  return user;
}

/** Bước email của `/signin`: lỗi hiện trong form (role="alert"), không toast cả khi thành công. */
export const checkEmailMutationOptions = mutationOptions({
  mutationFn: checkEmail,
  meta: {
    silentError: true
  }
});

/** Lỗi đăng nhập / đăng ký hiện ngay trong form (role="alert"), nên tắt toast lỗi */
export const loginMutationOptions = mutationOptions({
  mutationFn: async (req: ShopLoginRequest): Promise<ShopUserDTO> => startSession(await loginShop(req)),
  meta: {
    successMessage: (u) => `Welcome back, ${(u as ShopUserDTO).name}!`,
    silentError: true
  }
});

export const registerMutationOptions = mutationOptions({
  mutationFn: async (req: ShopRegisterRequest): Promise<ShopUserDTO> => startSession(await register(req)),
  meta: {
    successMessage: (u) => `Account created. Welcome, ${(u as ShopUserDTO).name}!`,
    silentError: true
  }
});

export const logoutMutationOptions = mutationOptions({
  mutationFn: async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    void logoutRemote(refreshToken);
    useAuthStore.getState().clear();
    useShopSession.getState().logout();
    clearUserQueries();
  },
  meta: {
    successMessage: "Signed out"
  }
});
