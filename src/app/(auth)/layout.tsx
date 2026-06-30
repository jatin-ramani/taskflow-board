import { CheckSquare } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Ambient accent glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-[-18%] h-[520px] w-[780px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[130px]"
          style={{ background: "radial-gradient(circle, #5b5fc7, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
          }}
        />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Brand */}
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent shadow-[0_8px_24px_-6px_rgba(94,106,210,0.7)]">
            <CheckSquare size={18} className="text-white" />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">TaskFlow</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border border-border bg-elevated/70 p-7 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            {children}
          </div>
          <p className="mt-5 text-center text-[11px] text-faint">
            Your personal task &amp; goal workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
