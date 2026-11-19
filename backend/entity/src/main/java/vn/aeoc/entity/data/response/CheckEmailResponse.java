package vn.aeoc.entity.data.response;

import lombok.Getter;
import lombok.Setter;

/** Kết quả {@code POST /account/public/check-email} (plan dang-nhap-nike §5.1): email đã chuẩn hoá + đã có tài khoản chưa. */
@Getter
@Setter
public class CheckEmailResponse {
    private String email;
    private boolean exists;

    public CheckEmailResponse() {
    }

    public CheckEmailResponse(String email, boolean exists) {
        this.email = email;
        this.exists = exists;
    }
}
