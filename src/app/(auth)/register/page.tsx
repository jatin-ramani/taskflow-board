"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LabeledInput, LabeledPassword } from "@/components/auth/auth-fields";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account");
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInRes?.error) {
        router.push("/login");
        return;
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[19px] font-semibold tracking-tight">Create account</h2>
        <p className="mt-1 text-[13px] text-muted">
          Start organizing your work in minutes
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <LabeledInput
          label="Name"
          icon={<User size={15} />}
          value={form.name}
          onChange={update("name")}
          placeholder="Jane Doe"
          autoComplete="name"
          required
        />

        <LabeledInput
          label="Email"
          type="email"
          icon={<Mail size={15} />}
          value={form.email}
          onChange={update("email")}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <LabeledPassword
          label="Password"
          icon={<Lock size={15} />}
          value={form.password}
          onChange={update("password")}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <LabeledPassword
          label="Confirm password"
          icon={<Lock size={15} />}
          value={form.confirmPassword}
          onChange={update("confirmPassword")}
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
        />

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="mt-1 h-10 w-full">
          {loading ? <Spinner size={16} className="text-white" /> : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
