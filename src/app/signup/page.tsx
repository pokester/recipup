"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/async";

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

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: "", color: "bg-transparent", width: "w-0" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const score = (pw.length >= 8 ? 1 : 0) + (pw.length >= 12 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0);
  if (score <= 2) return { label: "Weak", color: "bg-red-400", width: "w-1/3" };
  if (score <= 3) return { label: "Fair", color: "bg-amber-400", width: "w-2/3" };
  return { label: "Strong", color: "bg-[var(--color-sage)]", width: "w-full" };
}

function mapSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("over_email_send_rate_limit") || normalized.includes("rate limit")) {
    return "Too many signup emails have been sent. Please wait a few minutes and try again.";
  }
  if (normalized.includes("invalid email") || normalized.includes("invalid input syntax") || normalized.includes("email address is invalid")) {
    return "Please use a valid email address.";
  }
  if (normalized.includes("password")) {
    return "Password must be at least 8 characters.";
  }
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFounding, setIsFounding] = useState(false);

  useEffect(() => {
    setIsFounding(new URLSearchParams(window.location.search).get("plan") === "founding");
  }, []);

  const strength = passwordStrength(password);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboard` },
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
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboard` },
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    let signUpError: { message: string } | null = null;
    try {
      const supabase = createClient();
      const result = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        }),
        10000,
        "Sign up timed out",
      );
      signUpError = result.error;
    } catch (err) {
      signUpError = { message: (err as Error).message };
    }
    if (signUpError) {
      setError(mapSignupErrorMessage(signUpError.message));
      setLoading(false);
      return;
    }
    try {
      const pending = window.localStorage.getItem("recipup_pending_dog_profile");
      if (pending) {
        window.localStorage.setItem("recipup_dog_profile", pending);
        window.localStorage.removeItem("recipup_pending_dog_profile");
        router.push("/recipes");
        return;
      }
    } catch { /* ignore */ }
    router.push(isFounding ? "/welcome?type=founding" : "/onboard");
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

        <div className="space-y-6">
          <div>
            <p className="font-heading text-2xl text-[var(--color-warm-white)]">
              {isFounding ? "Lock in the founding price forever." : "14 days free. Then from £1.09/month."}
            </p>
            <p className="mt-2 text-sm text-[var(--color-warm-white)]/60">No card required. Cancel any time.</p>
          </div>

          <ul className="space-y-4">
            {(isFounding
              ? [
                  "£1.50/month — locked in for life",
                  "Full Pack Pro access included",
                  "Early access to every new feature",
                ]
              : [
                  "Personalised recipes for your exact dog",
                  "No spreadsheets, no guesswork",
                  "Cancel any time — no pressure",
                ]
            ).map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-warm-white)]/80">
                <span className="mt-0.5 shrink-0 text-[var(--color-coral)]">✓</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-[var(--color-forest-light)] p-6">
            {isFounding ? (
              <>
                <p className="text-sm font-semibold text-[var(--color-warm-white)]">
                  You&apos;re claiming a founding spot.
                </p>
                <p className="mt-1 text-xs text-[var(--color-warm-white)]/70">
                  14-day free trial, then £1.50/month — the best price we&apos;ll ever offer, locked in forever.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--color-warm-white)]">
                  14-day free trial — full Pack Pro access from day one.
                </p>
                <p className="mt-1 text-xs text-[var(--color-warm-white)]/70">
                  No card required. Upgrade, downgrade, or cancel whenever you like.
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--color-warm-white)]/40">
          {isFounding ? "Founding member pricing. Locked in the moment your account is created." : "Joining the first 500? You'll lock in the founding rate forever."}
        </p>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex w-full flex-col items-center justify-center bg-[var(--color-warm-white)] px-6 py-16 md:w-7/12 md:py-24 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo — mobile only */}
          <div className="mb-8 flex justify-center md:hidden">
            <Logo height={40} />
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">Create your account</h1>
            <p className="mt-2 text-[var(--color-ink-soft)]">Start cooking real food for your dog</p>
          </div>

          <div className="mb-5 rounded-2xl border border-[var(--color-butter-light)] bg-[var(--color-butter-muted)] px-4 py-3 text-sm text-[var(--color-ink)]">
            {isFounding
              ? "You're securing founding member pricing: £1.50/month, locked in forever. 14-day free trial included."
              : "Your 14-day free trial starts the moment you sign up. Full access — no card required."}
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
            <span className="text-xs text-[var(--color-ink-soft)]">or sign up with email</span>
            <div className="flex-1 border-t border-[var(--color-border)]" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--color-ink-soft)]">Your name</span>
              <input
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--color-ink-soft)]">Email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
              />
            </label>

            <div className="space-y-1.5">
              <label className="block space-y-1.5">
                <span className="text-sm text-[var(--color-ink-soft)]">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
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
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-[var(--color-border)]">
                    <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                  <span className="text-xs text-[var(--color-ink-soft)]">{strength.label}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-[var(--color-coral)] text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[var(--color-ink-soft)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--color-coral)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
