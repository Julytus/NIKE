import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Trang "không tìm thấy" dùng chung. `embedded` = hiện bên trong một layout đã có `<main>`
 * (vd khung quản trị) nên không tạo thêm landmark `main` và không chiếm cả màn hình.
 */
export function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper
      className={cn(
        "bg-background flex flex-col items-center justify-center px-4 text-center",
        embedded ? "py-16" : "min-h-screen"
      )}
    >
      <Card className="bg-background max-w-lg rounded-3xl border-0 p-12 shadow-lg">
        <CardContent className="space-y-6">
          <h1 className="text-6xl leading-tight font-bold md:text-7xl">404</h1>
          <p className="text-muted-foreground text-lg md:text-xl">Trang bạn đang tìm kiếm không tồn tại.</p>
          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate({ to: embedded ? "/admin" : "/" })}
              size="lg"
              className="rounded-full"
              data-testid="not-found-home"
            >
              Về Trang Chủ
            </Button>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  );
}
