import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { NikeSwoosh } from "@/components/brand/nike-swoosh";
import { ProductCard } from "@/components/shop/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { createSuggestQueryOptions } from "@/lib/tanstack/options/product";

export const POPULAR_SEARCHES = ["air force 1", "jordan", "basketball shoes", "pegasus", "slides", "air max"];

const DEBOUNCE_MS = 300;

/**
 * Khung tìm kiếm (plan giao-dien-nike §6.4): desktop là khối trắng phủ phần trên, mobile toàn màn hình.
 * Gõ → chờ 300ms → gợi ý tối đa 6 sản phẩm; Enter / pill / "Xem tất cả" → `/w?q=`.
 * Radix tự focus ô nhập (phần tử focus được đầu tiên); đóng (Esc, "Huỷ", bấm nền) thì trả focus về `returnFocusRef`.
 * Nội dung unmount khi đóng nên mở lại ô rỗng.
 */
export function SearchOverlay({
  open,
  onOpenChange,
  returnFocusRef
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nút "Tìm kiếm" — nhận lại focus khi đóng (§6.4) */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          data-testid="search-overlay"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocusRef.current?.focus();
          }}
          className="shop data-[state=open]:animate-in data-[state=open]:slide-in-from-top-4 fixed inset-0 z-50 flex flex-col overflow-y-auto bg-(--sh-bg) text-(--sh-fg) outline-none motion-reduce:animate-none lg:bottom-auto lg:max-h-[100dvh] lg:min-h-[220px]"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <SearchBody onDone={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const term = value.trim();
  const debounced = useDebouncedValue(term, DEBOUNCE_MS);
  const query = useQuery(createSuggestQueryOptions(debounced));
  const waiting = term.length > 0 && (term !== debounced || query.isFetching);

  const goSearch = (q: string) => {
    onDone();
    void navigate({ to: "/w", search: { q } });
  };

  const popular = (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-(--sh-muted)">Popular Search Terms</p>
      <ul className="flex flex-wrap gap-3">
        {POPULAR_SEARCHES.map((q) => (
          <li key={q}>
            <Link
              to="/w"
              search={{ q }}
              onClick={onDone}
              className="inline-flex h-10 items-center rounded-[30px] bg-(--sh-surface) px-5 text-base font-medium outline-none hover:bg-(--sh-surface-hover) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
            >
              {q}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  let results: React.ReactNode = null;
  if (term.length > 0) {
    let content: React.ReactNode;
    if (waiting) {
      content = (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-square rounded-none bg-(--sh-surface)" />
            </li>
          ))}
        </ul>
      );
    } else if (query.isError) {
      content = <p className="text-base">Couldn't load suggestions. Press Enter to see all results.</p>;
    } else if (query.data && query.data.items.length === 0) {
      content = (
        <div className="flex flex-col gap-8">
          <p className="text-base">{`We couldn't find anything for "${debounced}".`}</p>
          {popular}
        </div>
      );
    } else if (query.data) {
      content = (
        <div className="flex flex-col gap-4">
          <p className="text-base font-medium text-(--sh-muted)">Top Suggestions</p>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {query.data.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} size="sm" testId="search-suggestion" onNavigate={onDone} />
              </li>
            ))}
          </ul>
          <Link
            to="/w"
            search={{ q: debounced }}
            onClick={onDone}
            className="self-start rounded-sm text-base font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
          >
            {`View All ${query.data.total} Results`}
          </Link>
        </div>
      );
    }
    results = (
      <div data-testid="search-results" aria-busy={waiting} aria-live="polite">
        {content}
      </div>
    );
  }

  return (
    <>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) goSearch(term);
        }}
        className="flex items-center gap-4 px-4 pt-3 lg:px-12 lg:pt-4"
      >
        <span className="hidden w-[180px] shrink-0 lg:block">
          <NikeSwoosh className="h-6" />
        </span>
        <div className="flex h-10 flex-1 items-center gap-2 rounded-[30px] bg-(--sh-surface) px-3 focus-within:ring-2 focus-within:ring-(--sh-fg)/40 lg:mx-auto lg:max-w-[660px]">
          <Search aria-hidden className="size-5 shrink-0" />
          <input
            type="search"
            aria-label="Search products"
            placeholder="Search"
            maxLength={100}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-(--sh-muted) [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <span className="flex shrink-0 justify-end lg:w-[180px]">
          <DialogPrimitive.Close className="rounded-sm text-base font-medium outline-none hover:text-(--sh-muted) focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50">
            Cancel
          </DialogPrimitive.Close>
        </span>
      </form>
      <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-10 lg:mx-auto lg:max-w-[1100px] lg:px-12">
        {results}
        {term.length === 0 && popular}
      </div>
    </>
  );
}
