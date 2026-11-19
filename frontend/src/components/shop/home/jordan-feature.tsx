import { Link } from "@tanstack/react-router";
import jordanImage from "@/assets/home/jordan.webp";
import { ShopButton } from "@/components/shop/ui/shop-button";

/** Khối Jordan (plan giao-dien-nike §6.6 mục 3): desktop hai cột (ảnh trái 60%), mobile xếp dọc. */
export function JordanFeature() {
  return (
    <section
      data-testid="home-jordan"
      aria-labelledby="home-jordan-title"
      className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12"
    >
      <div className="aspect-square overflow-hidden bg-(--sh-surface) lg:basis-[60%]">
        <img src={jordanImage} alt="" loading="lazy" className="size-full object-cover" />
      </div>
      <div className="flex flex-col items-start gap-3 lg:flex-1">
        <p className="text-base font-medium">Jordan</p>
        <h2 id="home-jordan-title" className="font-display text-4xl leading-[1.1] font-semibold uppercase lg:text-6xl">
          Bay cao cùng Jordan
        </h2>
        <p className="text-base">Tinh thần bóng rổ từ sân đấu ra phố.</p>
        <ShopButton asChild variant="primary" size="sm" className="mt-3">
          <Link to="/w/$danhMuc" params={{ danhMuc: "jordan" }}>
            Mua Jordan
          </Link>
        </ShopButton>
      </div>
    </section>
  );
}
