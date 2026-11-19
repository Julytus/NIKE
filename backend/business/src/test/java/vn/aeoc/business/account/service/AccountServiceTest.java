package vn.aeoc.business.account.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import vn.aeoc.authenticate.service.auth.UserService;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.entity.data.mysql.auth.User;
import vn.aeoc.entity.data.response.CheckEmailResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Plan dang-nhap-nike §9: TC-U1 → TC-U3 ({@link AccountService#checkEmail}). */
class AccountServiceTest {
    private UserService userService;
    private AccountService service;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        service = new AccountService(userService);
    }

    private static User withEmail(String email) {
        User user = new User();
        user.setEmail(email);
        return user;
    }

    @Test
    void tcU1_chuanHoaVaTonTai() {
        User found = new User();
        found.setId(5);
        when(userService.getUserByEmail("khach1@nike.local")).thenReturn(found);

        CheckEmailResponse result = service.checkEmail(withEmail(" KHACH1@nike.Local "));

        assertThat(result.getEmail()).isEqualTo("khach1@nike.local");
        assertThat(result.isExists()).isTrue();
        verify(userService, times(1)).getUserByEmail("khach1@nike.local");
    }

    @Test
    void tcU2_khongTonTai() {
        when(userService.getUserByEmail("x@y.vn")).thenReturn(new User());

        CheckEmailResponse result = service.checkEmail(withEmail("x@y.vn"));

        assertThat(result.getEmail()).isEqualTo("x@y.vn");
        assertThat(result.isExists()).isFalse();
    }

    @Test
    void tcU3_requestNull() {
        assertThatThrownBy(() -> service.checkEmail(null))
                .isInstanceOf(AppException.class)
                .hasMessage("Please enter your email.");
        verifyNoInteractions(userService);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "  "})
    void tcU3_emailTrong(String email) {
        assertThatThrownBy(() -> service.checkEmail(withEmail(email)))
                .isInstanceOf(AppException.class)
                .hasMessage("Please enter your email.");
        verifyNoInteractions(userService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "LONG"})
    void tcU3_emailSaiDinhDang(String email) {
        String value = "LONG".equals(email) ? "a".repeat(251) + "@x.vn" : email;

        assertThatThrownBy(() -> service.checkEmail(withEmail(value)))
                .isInstanceOf(AppException.class)
                .hasMessage("Please enter a valid email address.");
        verifyNoInteractions(userService);
    }
}
