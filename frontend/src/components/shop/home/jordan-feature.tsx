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
        <h2 id="home-jordan-title" className="font-display text-5xl leading-[1.05] uppercase lg:text-7xl">
          Fly Higher with Jordan
        </h2>
        <p className="text-base">Basketball spirit, from the court to the street.</p>
        <ShopButton asChild variant="primary" size="sm" className="mt-3">
          <Link to="/w/$category" params={{ category: "jordan" }}>
            Shop Jordan
          </Link>
        </ShopButton>
      </div>
    </section>
  );
}
