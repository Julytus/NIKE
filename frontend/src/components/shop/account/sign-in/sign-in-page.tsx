import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { JordanJumpman } from "@/components/brand/jordan-jumpman";
import { NikeSwoosh } from "@/components/brand/nike-swoosh";
import { ShopShell } from "@/components/shop/layout/shop-shell";
import { safeRedirect } from "@/lib/sign-in-redirect";
import { EmailStep } from "./email-step";
import { JoinStep } from "./join-step";
import { PasswordStep } from "./password-step";

type Step = "email" | "password" | "join";

/**
 * Trang `/signin` kiểu nike.com (plan dang-nhap-nike §6): không header / footer cửa hàng, khối giữa rộng 460px.
 * Bước giữ trong state (§11 câu 3) — F5 thì về bước email. Xong thì về `redirect` (đã lọc, thay lịch sử).
 */
export function SignInPage({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<{ step: Step; email: string }>({ step: "email", email: "" });

  const finish = () => void navigate({ href: safeRedirect(redirect), replace: true });
  const toEmail = () => setState((s) => ({ ...s, step: "email" }));

  return (
    <ShopShell>
      <main
        id="shop-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[460px] px-4 pt-10 pb-16 outline-none sm:pt-14"
      >
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/"
            aria-label="Nike Home"
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-(--sh-fg)/50"
          >
            <NikeSwoosh className="h-6" />
          </Link>
          <JordanJumpman className="h-6" />
        </div>

        {state.step === "email" && (
          <EmailStep
            defaultEmail={state.email}
            onChecked={({ email, exists }) =>
              setState({ step: exists ? "password" : "join", email })
            }
          />
        )}
        {state.step === "password" && (
          <PasswordStep email={state.email} onEdit={toEmail} onSignedIn={finish} />
        )}
        {state.step === "join" && (
          <JoinStep
            email={state.email}
            onEdit={toEmail}
            onSignInInstead={() => setState((s) => ({ ...s, step: "password" }))}
            onJoined={finish}
          />
        )}
      </main>
    </ShopShell>
  );
}
