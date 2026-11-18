import { Link } from "@tanstack/react-router";
import heroImage from "@/assets/home/hero.webp";
import { ShopButton } from "@/components/shop/ui/shop-button";

/** Hero trang chủ (plan giao-dien-nike §6.6 mục 1): ảnh lớn + khối chữ căn giữa + 2 nút. */
export function HomeHero() {
  return (
    <section data-testid="home-hero" className="flex flex-col">
      <div className="aspect-[4/5] overflow-hidden bg-(--sh-surface) sm:aspect-[16/9] lg:aspect-[16/7]">
        <img src={heroImage} alt="" fetchPriority="high" className="size-full object-cover" />
      </div>
      <div className="flex flex-col items-center gap-4 pt-8 text-center sm:pt-12">
        <p className="text-base font-medium">Mới về</p>
        <h1 className="font-display text-5xl leading-[1.1] font-semibold uppercase lg:text-[88px]">Bước vào mùa mới</h1>
        <p className="max-w-xl text-base">Những đôi giày vừa cập bến, sẵn sàng cho mọi hành trình của bạn.</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <ShopButton asChild variant="primary" size="sm">
            <Link to="/w" search={{ nhan: "moi-ve" }}>
              Mua ngay
            </Link>
          </ShopButton>
          <ShopButton asChild variant="outline" size="sm">
            <Link to="/w">Xem tất cả giày</Link>
          </ShopButton>
        </div>
      </div>
    </section>
  );
}
