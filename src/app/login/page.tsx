"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zm3.378-3.066c.787-.975 1.31-2.35 1.167-3.73-1.128.052-2.5.78-3.293 1.73-.728.847-1.37 2.22-1.195 3.527 1.261.104 2.54-.657 3.321-1.527z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let signInError: { message: string } | null = null;
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      signInError = result.error;
    } catch (err) {
      signInError = { message: (err as Error).message };
    }
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col md:flex-row">
      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-between bg-[var(--color-forest)] p-12 py-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-white.png"
          alt="Recipup"
          height={40}
          style={{ height: "40px", width: "auto" }}
        />

        <div>
          <p className="font-heading text-6xl leading-none text-[var(--color-coral)]">&ldquo;</p>
          <blockquote className="mt-2 font-heading text-2xl leading-snug text-[var(--color-warm-white)]">
            I always knew what went into Rory&apos;s bowl. That changed everything.
          </blockquote>
          <p className="mt-4 text-sm text-[var(--color-warm-white)]/60">
            — Sarah, Recipup member
          </p>
        </div>

        <ul className="space-y-3">
          {[
            "FEDIAF + AAFCO compliant recipes",
            "Breed-specific for 40+ breeds",
            "No card required to start",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-[var(--color-warm-white)]/80">
              <span className="text-[var(--color-coral)]">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex w-full flex-col items-center justify-center bg-[var(--color-warm-white)] px-6 py-16 md:w-7/12 md:py-24 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo — mobile only */}
          <div className="mb-8 flex justify-center md:hidden">
            <Logo height={40} />
          </div>

          <div className="mb-10">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">Welcome back</h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">
              Sign in to see your dogs&apos; recipe plans
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--color-coral)] px-6 text-sm font-semibold text-[var(--color-coral)] transition-colors hover:bg-[var(--color-sand)] disabled:opacity-50"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              type="button"
              onClick={handleApple}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[var(--color-ink)] px-6 text-sm font-semibold text-[var(--color-warm-white)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <AppleIcon />
              Continue with Apple
            </button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-ink-soft)]">or sign in with email</span>
            <div className="flex-1 border-t border-[var(--color-border)]" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                That email or password doesn&apos;t look right. Please try again.
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--color-ink-soft)]">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--color-ink-soft)]">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-warm-white)] px-4 pr-12 outline-none focus:border-[var(--color-coral)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-coral)]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-[var(--color-coral)] text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-center">
              <Link
                href="/reset-password"
                className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-coral)]"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[var(--color-coral)] hover:underline"
            >
              Create a free account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
