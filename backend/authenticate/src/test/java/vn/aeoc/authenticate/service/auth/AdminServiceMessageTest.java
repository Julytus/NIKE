package vn.aeoc.authenticate.service.auth;

import org.junit.jupiter.api.Test;
import vn.aeoc.authenticate.repository.auth.ModuleRepository;
import vn.aeoc.authenticate.repository.auth.ResourceRepository;
import vn.aeoc.authenticate.repository.auth.RoleRepository;
import vn.aeoc.base.exception.AppException;
import vn.aeoc.base.util.QueryExecutor;
import vn.aeoc.entity.data.mysql.auth.Module;
import vn.aeoc.entity.data.mysql.auth.Resource;
import vn.aeoc.entity.data.mysql.auth.Role;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * TC-U3 (plan tieng-anh-cua-hang §9, §5.4): lỗi nghiệp vụ của RoleService / ModuleService / ResourceService
 * ném AppException với message tiếng Anh nguyên văn. Repository giả lập bằng Mockito, không cần DB.
 */
class AdminServiceMessageTest {
    private final QueryExecutor queryExecutor = mock(QueryExecutor.class);

    @Test
    void tcU3_roleTrungTen() {
        RoleRepository repository = mock(RoleRepository.class);
        when(repository.existsByName(eq("Administrator"), isNull())).thenReturn(true);
        RoleService service = new RoleService(repository, queryExecutor);

        Role request = new Role();
        request.setName("  Administrator  ");
        AppException e = assertThrows(AppException.class, () -> service.upsert(request));

        assertEquals("Role name already exists", e.getMessage());
        verify(repository, never()).insertReturning(any());
    }

    @Test
    void tcU3_roleDangGanTaiKhoan() {
        RoleRepository repository = mock(RoleRepository.class);
        Role admin = new Role();
        admin.setId(1);
        admin.setName("Administrator");
        when(repository.getById(1)).thenReturn(admin);
        when(repository.countUsers(1)).thenReturn(1);
        RoleService service = new RoleService(repository, queryExecutor);

        AppException e = assertThrows(AppException.class, () -> service.delete(1));

        assertEquals("This role is assigned to accounts and can't be deleted", e.getMessage());
    }

    @Test
    void tcU3_moduleTrungCode() {
        ModuleRepository repository = mock(ModuleRepository.class);
        when(repository.existsByCode(eq("SYSTEM"), isNull())).thenReturn(true);
        ModuleService service = new ModuleService(repository, mock(ResourceService.class), queryExecutor);

        Module request = new Module();
        request.setName("Duplicate Module");
        request.setCode("SYSTEM");
        AppException e = assertThrows(AppException.class, () -> service.upsert(request));

        assertEquals("Module code already exists", e.getMessage());
    }

    @Test
    void tcU3_resourceTrungCode() {
        ResourceRepository repository = mock(ResourceRepository.class);
        when(repository.existsByCode(anyString(), isNull())).thenReturn(true);
        ResourceService service = new ResourceService(repository, queryExecutor);

        Resource request = new Resource();
        request.setName("Duplicate Resource");
        request.setCode("ROLE");
        request.setUri("/duplicate-role/");
        AppException e = assertThrows(AppException.class, () -> service.upsert(request));

        assertEquals("Resource code already exists", e.getMessage());
    }

    @Test
    void tcU3_xoaTaiNguyenHeThong() {
        ResourceRepository repository = mock(ResourceRepository.class);
        Resource role = new Resource();
        role.setId(3);
        role.setCode("ROLE");
        when(repository.getById(3)).thenReturn(role);
        ResourceService service = new ResourceService(repository, queryExecutor);

        AppException e = assertThrows(AppException.class, () -> service.delete(3));

        assertEquals("System resources can't be deleted", e.getMessage());
        verify(repository, never()).delete(3);
    }
}
