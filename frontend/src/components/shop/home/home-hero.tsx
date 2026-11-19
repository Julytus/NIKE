import { Link } from "@tanstack/react-router";
import giveSportBanner from "@/assets/home/give-sport.png";
import heroImage from "@/assets/home/hero.webp";
import { ShopButton } from "@/components/shop/ui/shop-button";

/**
 * Hero trang chủ (plan giao-dien-nike §6.6 mục 1), bố cục như nike.com:
 * ảnh tràn hết chiều ngang, chữ trắng + nút trắng đè lên phần dưới ảnh (có lớp tối dần để đọc được chữ).
 */
export function HomeHero() {
  return (
    <section data-testid="home-hero" className="relative isolate overflow-hidden bg-(--sh-fg)">
      {/* Dải banner "Give Sport" ngay trên ảnh hero; mobile giữ chiều cao tối thiểu, cắt hai bên */}
      <img
        src={giveSportBanner}
        alt="Give Sport — Holiday 2026 Gifting Collection"
        data-testid="home-hero-banner"
        className="block h-12 w-full object-cover object-left sm:h-auto"
      />
      <div className="relative">
        <img
          src={heroImage}
          alt=""
          fetchPriority="high"
          className="aspect-[4/5] w-full object-cover sm:aspect-[16/9] lg:aspect-[2/1] lg:max-h-[calc(100svh-96px)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-10 text-center text-white lg:pb-14">
          <p className="text-base font-medium">Just In</p>
          <h1 className="font-display text-5xl leading-[1.05] uppercase lg:text-8xl">
            Step Into the New Season
          </h1>
          <p className="max-w-xl text-base font-medium">
            Fresh pairs just landed, ready for wherever you go next.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-3">
            <ShopButton asChild size="sm" className="bg-white text-(--sh-fg) hover:bg-white/80">
              <Link to="/w" search={{ badge: "just-in" }}>
                Shop Now
              </Link>
            </ShopButton>
            <ShopButton asChild size="sm" className="bg-white text-(--sh-fg) hover:bg-white/80">
              <Link to="/w">Shop All Shoes</Link>
            </ShopButton>
          </div>
        </div>
      </div>
    </section>
  );
}
