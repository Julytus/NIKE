# Nike Shoes (repo DownBeat) — Đồ án: Xây dựng Automation test cho web thương mại điện tử bán giày dùng JavaScript với Playwright

Monorepo: `backend/` (Spring Boot 3.2, Java 21, jOOQ, MySQL, MinIO) · `frontend/` (React 19, Vite, TanStack) · `automation/` (Playwright + JavaScript, lập ở lát `khung-automation`).
Đang chuyển từ cửa hàng LUT cũ sang cửa hàng giày mô phỏng nike.com/vn (dùng tên, logo, ảnh Nike **chỉ để học, chạy local**). Kế hoạch tổng: `plan/thiet-ke-giay.md`; đặc tả UI + ảnh tham chiếu: `plan/ui-nike/README.md`; danh sách plan: `plan/README.md`.
Phần LUT (kho, gói, tải, bộ sưu tập, gợi ý) đang chờ gỡ ở lát `go-lut`; các plan LUT / AEOC cũ trong `plan/` chỉ để tham khảo cách viết.

## Vai trò

**Claude làm toàn bộ** (người dùng chốt 18/11/2026): lập plan + test case, viết test automation, code backend, code frontend, tự review, chạy E2E, viết tài liệu. Không dùng Orca / Codex / agy trong dự án này.

Được sửa: mọi thư mục trong repo. Quy tắc code nằm ở `AGENTS.md` (chung), `backend/AGENTS.md`, `frontend/AGENTS.md`; Claude tuân theo khi code và dùng lại làm checklist khi tự review.
Vì người code và người kiểm là một: **viết test nghiệm thu trước khi code**, không sửa spec chỉ để test xanh (chỉ sửa khi spec sai so với plan, ghi lý do vào §12 của plan).

## Luồng làm việc

```
/plan-feature <slug>   → plan/<slug>.md (status: draft) + test case
        │  người dùng đọc, sửa, nói "duyệt"  → status: approved
        ▼  /clear
/cook <slug>            — phiên A (plan approved)
  preflight (Docker MySQL/MinIO, backend :9500) → viết spec nghiệm thu ở automation/ (§9)
  → code backend (§7) → tự review + mvn test + restart + chạy nhóm API → ghi §12 "phiên A xong"
        ▼  /clear
/cook <slug>            — phiên B (§12 "phiên A xong")
  code frontend (§8, theo plan/ui-nike) → tự review + build + lint
  → E2E có giao diện (--headed, slowMo) + chụp ảnh tài liệu → smoke toàn bộ → ghi §12 "phiên B xong"
        ▼  /clear
/doc-chuc-nang <slug>   — phiên C
  docs/chuc-nang/<slug>.md, plan status: done, commit + push branch feature/<slug> + mở PR vào main (người dùng tự merge)
```

Chia phiên vì mỗi lượt gọi tool gửi lại toàn bộ ngữ cảnh; §12 của plan là nhật ký nối các phiên. Chi tiết: `.claude/skills/{plan-feature,cook,doc-chuc-nang}/SKILL.md`.
Mục §7 "Việc backend" / §8 "Việc frontend" trong plan (kể cả plan cũ ghi "Codex" / "agy") đều là việc của Claude.

## Quy ước thư mục

- `plan/<slug>.md`: một plan cho **một lát chức năng** (BE + FE + test). `slug` kebab-case không dấu. Mẫu: `plan/_template.md`.
- `automation/tests/<khu-vực>/<slug>.spec.js` (UI) và `automation/tests/api/<slug>.api.spec.js` (API): test nghiệm thu từng lát, dùng page object / fixture / API client trong `automation/`.
- `docs/chuc-nang/<slug>.md`: tài liệu chức năng cho quyển báo cáo; ảnh ở `docs/chuc-nang/img/<slug>/`. Tài liệu kiểm thử (test plan, test case, ma trận truy vết, bug report) ở `docs/kiem-thu/`.

Trạng thái plan: `draft` → `approved` → `in-progress` → `done` (hoặc `blocked`). Chỉ người dùng mới duyệt; Claude chỉ đổi sang `approved` khi người dùng nói rõ là duyệt.

## Lệnh hay dùng

```bash
sh scripts/ai/backend-restart.sh                    # build + restart backend :9500, in dòng Flyway
docker compose -f docker-compose.local.yml --env-file backend/.env up -d   # MySQL / MinIO local (container downBeat-*)
cd backend && mvn -q "-Djooq.codegen.skip=true" -pl <module> -am test
cd frontend && pnpm build && pnpm lint
cd automation && pnpm test:smoke                    # (sau lát khung-automation) nhóm @smoke, mọi trình duyệt
cd automation && E2E_SLOWMO=400 pnpm exec playwright test <spec> --project=chromium --headed --workers=1 --reporter=line
```

## Quy tắc chung

- Hợp đồng API ở §5 và chuỗi giao diện ở §6 của plan là nguồn sự thật cho code và test. Cần đổi thì sửa plan trước, ghi §12.
- Không commit, push hay đổi branch khi người dùng chưa bảo. Ngoại lệ đã được cho phép sẵn: `/doc-chuc-nang` tự tạo branch `feature/<slug>`, commit, push và mở PR vào `main`; không bao giờ tự merge hay push thẳng vào `main`. Không dùng `git stash/reset/checkout -- <file>/clean` làm mất thay đổi chưa commit.
- Báo cáo, tài liệu và chữ giao diện viết bằng tiếng Việt; tên / mô tả sản phẩm giữ tiếng Anh như nike.com; tiền VNĐ `5.279.000 ₫`.
- Một cửa hàng duy nhất: không có bảng `branch`, cột `bsn_id` hay `BsnScope`. Phân quyền quản trị bằng `role` + `permission` + `resource` (cấp qua migration).
- Ghi dữ liệu đồng bộ, đơn giản: không dùng `@Idempotent` / header `Idempotency-Key` / Kafka. Chống trùng bằng ràng buộc DB + kiểm tra ở service.
- Tài khoản local: `admin@downbeat.local` / `Admin@123` (toàn quyền), `noaccess@downbeat.local` / `Admin@123` (không quyền), `free@downbeat.local` / `Admin@123` (khách hàng).
