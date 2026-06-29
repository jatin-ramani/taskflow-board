"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LabeledInput, LabeledPassword } from "@/components/auth/auth-fields";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[19px] font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1 text-[13px] text-muted">Welcome back to TaskFlow</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <LabeledInput
          label="Email"
          type="email"
          icon={<Mail size={15} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <LabeledPassword
          label="Password"
          icon={<Lock size={15} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="mt-1 h-10 w-full">
          {loading ? <Spinner size={16} className="text-white" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
