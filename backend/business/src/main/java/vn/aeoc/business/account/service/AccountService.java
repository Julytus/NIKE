package vn.aeoc.business.account.service;

import org.springframework.stereotype.Service;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.base.constant.ErrorCode;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.CommonUtils;
import vn.aeoc.entity.data.mysql.auth.User;
import vn.aeoc.entity.data.response.CheckEmailResponse;
import vn.aeoc.entity.data.response.TokenResponse;

import java.util.Locale;

@Service
public class AccountService {
    /** Cùng giới hạn độ dài email với {@code /account/register} (cột user_app.email). */
    static final int EMAIL_MAX_LENGTH = 255;
    static final String MSG_EMAIL_EMPTY = "Please enter your email.";
    static final String MSG_EMAIL_INVALID = "Please enter a valid email address.";

    private final UserService userService;

    public AccountService(UserService userService) {
        this.userService = userService;
    }

    public TokenResponse register(User request) {
        return userService.register(request);
    }

    /**
     * Email đã có tài khoản chưa (plan dang-nhap-nike §5.1) — bước 1 của trang /signin.
     * Chuẩn hoá trim + chữ thường; trống → "Please enter your email."; không có @ hoặc > 255 ký tự →
     * "Please enter a valid email address.". Tài khoản bị khoá vẫn tính là đã có. Chỉ đọc DB.
     */
    public CheckEmailResponse checkEmail(User request) {
        String raw = request == null ? null : request.getEmail();
        String email = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, MSG_EMAIL_EMPTY);
        }
        if (!email.contains("@") || email.length() > EMAIL_MAX_LENGTH) {
            throw new AppException(ErrorCode.BAD_REQUEST, MSG_EMAIL_INVALID);
        }
        User user = userService.getUserByEmail(email);
        boolean exists = user != null && CommonUtils.NVL(user.getId()) > 0;
        return new CheckEmailResponse(email, exists);
    }

    /** Thông tin tài khoản đang đăng nhập (plan go-lut §5.2): không trả mật khẩu, không còn trường gói. */
    public User me(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new AppException(ErrorCode.LOGIN);
        }
        User user = userService.getUserById(userId);
        if (user == null || user.getId() == null) {
            throw new AppException(ErrorCode.LOGIN);
        }
        if (CommonUtils.NVL(user.getActive()) != 1) {
            throw new AppException(ErrorCode.LOCK_ACCOUNT);
        }
        User result = new User();
        result.setId(user.getId());
        result.setIsOperator(CommonUtils.NVL(user.getIsOperator()));
        result.setRoleId(user.getRoleId());
        result.setRoleName(user.getRoleName());
        result.setName(user.getName());
        result.setEmail(user.getEmail());
        result.setHasPassword(userService.hasPassword(userId) ? 1 : 0);
        result.setActive(user.getActive());
        result.setFirstTime(CommonUtils.NVL(user.getFirstTime()));
        return result;
    }
}
