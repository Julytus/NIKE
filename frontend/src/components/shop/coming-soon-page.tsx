/** Trang tạm ở `/` sau khi gỡ cửa hàng cũ (plan go-lut §6.1); lát `giao-dien-nike` thay bằng trang chủ Nike. */
export function ComingSoonPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-medium md:text-5xl">Cửa hàng đang được nâng cấp</h1>
      <p className="text-base text-(--sh-muted)">Trang bán giày sẽ sớm ra mắt.</p>
    </section>
  );
}
