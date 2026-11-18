@AGENTS.md

# Ghi chú cho Claude (frontend)

Claude tự code `frontend/src` theo `frontend/AGENTS.md` và tự review lại theo checklist dưới đây. Test nghiệm thu **không** nằm trong `frontend/` nữa: mọi spec Playwright (JavaScript) ở `automation/` — quy ước viết spec, page object, fixture, dữ liệu test xem [../automation/README.md](../automation/README.md).

## Checklist review diff `git diff -- frontend`

- [ ] Nhãn, nút, tiêu đề, toast khớp plan §6 từng chữ; input có label.
- [ ] Phần tử tương tác chính có `data-testid` theo quy ước "Quy ước để dễ kiểm thử tự động" ở `frontend/AGENTS.md`; nút chỉ có icon có `aria-label`.
- [ ] Type và hàm axios khớp plan §5; `pnpm api:types` (khi backend đã chạy) không lệch với `lib/types/<domain>.ts`.
- [ ] Không gọi `toast`/`refetch` trong `onSuccess`; mutation có `meta` đủ 3 khoá.
- [ ] `AdminPermissionGuard` + sidebar dùng đúng `RESOURCE_CODE` ở plan §2.
- [ ] Dùng component shadcn có sẵn thay vì `div` tự style; không `--overwrite` file cũ trong `components/ui/`; component mới thêm qua `shadcn add` có trong `git diff --stat`. Không đổi theme/màu/font toàn app. Đối chiếu quy tắc ở `.agents/skills/shadcn/rules/*.md` (styling, composition), nhưng quy ước ở `frontend/AGENTS.md` thắng khi mâu thuẫn.
- [ ] Không sửa `routeTree.gen.ts` bằng tay.
- [ ] `pnpm build` + `pnpm lint` xanh; spec của lát ở `automation/` xanh.
