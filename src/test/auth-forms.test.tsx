import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Shared mocks needed by both auth pages ──────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: "1" } }, error: null }),
    },
    from: vi.fn().mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: null }) }),
  }),
}));

// ─── Login form ──────────────────────────────────────────────────────────────

describe("LoginPage — autocomplete attributes", () => {
  let LoginPage: React.ComponentType;

  beforeEach(async () => {
    const mod = await import("@/app/login/page");
    LoginPage = mod.default;
  });

  it("email input has autoComplete=email", () => {
    render(<LoginPage />);
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    expect(emailInput).toHaveAttribute("autocomplete", "email");
  });

  it("password input has autoComplete=current-password", () => {
    render(<LoginPage />);
    // password inputs are not role=textbox; find by label
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
  });
});

// ─── Signup form ─────────────────────────────────────────────────────────────

describe("SignupPage — autocomplete attributes", () => {
  let SignupPage: React.ComponentType;

  beforeEach(async () => {
    const mod = await import("@/app/signup/page");
    SignupPage = mod.default;
  });

  it("name input has autoComplete=name", () => {
    render(<SignupPage />);
    const nameInput = screen.getByRole("textbox", { name: /your name/i });
    expect(nameInput).toHaveAttribute("autocomplete", "name");
  });

  it("email input has autoComplete=email", () => {
    render(<SignupPage />);
    const emailInput = screen.getByRole("textbox", { name: /email/i });
    expect(emailInput).toHaveAttribute("autocomplete", "email");
  });

  it("password input has autoComplete=new-password", () => {
    render(<SignupPage />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("autocomplete", "new-password");
  });
});
