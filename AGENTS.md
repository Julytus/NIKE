# Quy tắc chung khi code (Claude tự code, tự kiểm)

Trong dự án này Claude làm toàn bộ: plan, test automation, backend, frontend, tài liệu (người dùng chốt 18/11/2026). File này là quy tắc chung; quy tắc riêng từng phía ở `backend/AGENTS.md`, `frontend/AGENTS.md`, quy ước bộ test ở `automation/README.md`. Khi tự review, dùng lại các file này làm checklist như review code của người khác.

## 1. Phạm vi theo phía

| Phía | Đọc trước tiên | Thư mục |
|---|---|---|
| Backend | `backend/AGENTS.md` | `backend/**`, `tools/seed/**` |
| Frontend | `frontend/AGENTS.md` | `frontend/**` |
| Automation test | `automation/README.md` | `automation/**`, `.github/workflows/**` |

Không sửa `.agents/**` (skill dùng chung). `.env*`, `docker-compose*.yml`, `scripts/**` chỉ sửa khi plan yêu cầu.

## 2. Trước khi code

1. Đọc plan `plan/<slug>.md` (status `approved` / `in-progress`) và §12 "Nhật ký thực hiện".
2. Viết spec nghiệm thu ở `automation/` theo §9 **trước** khi code (`tests/<khu-vực>/<slug>.spec.js`, API thuần ở `tests/api/<slug>.api.spec.js`).
3. Xem code mẫu mà AGENTS.md của phía đó chỉ định rồi chép đúng kiểu (đặt tên, cấu trúc package / thư mục, cách bọc response).

## 3. Trong khi code

- **Hợp đồng API (§5 của plan) là cố định**: path, method, tên field, kiểu dữ liệu, mã lỗi, message. Muốn đổi thì sửa plan trước và ghi §12.
- **Nhãn giao diện (§6 của plan) là cố định**: tiêu đề, tên nút, label field, nội dung toast. Test chọn phần tử theo đúng các chuỗi này và `data-testid` (quy ước ở `frontend/AGENTS.md`).
- Không sửa spec chỉ để test xanh. Chỉ sửa spec khi spec sai so với plan, ghi lý do vào §12.
- Chỉ làm những gì trong plan; việc ngoài phạm vi ghi vào §11 / §12.
- Không `git commit/stash/reset/checkout -- <file>/clean/rebase`, không đổi branch (trừ phiên `/doc-chuc-nang`).

## 4. Xong việc

Chỉ coi là xong khi mọi lệnh kiểm tra của plan đều xanh và đã tự chạy: `mvn test` (backend), `pnpm build` + `pnpm lint` (frontend), spec của lát + `pnpm test:smoke` (automation). Ghi kết quả, điểm lệch plan và lý do vào §12.
