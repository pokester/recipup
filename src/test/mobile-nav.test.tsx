import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNav } from "@/components/layout/mobile-nav";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Mock supabase client
const mockSignOut = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  user_metadata: { full_name: "Test User" },
} as unknown as Parameters<typeof MobileNav>[0]["user"];

const mockDogs = [
  { id: "dog-1", name: "bella", breed: "Labrador" },
  { id: "dog-2", name: "rex", breed: null },
];

beforeEach(() => {
  mockPathname = "/";
  vi.clearAllMocks();
  document.body.style.overflow = "";
});

describe("MobileNav — hamburger toggle", () => {
  it("renders a closed-menu button by default", () => {
    render(<MobileNav user={null} dogs={[]} />);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("opens the drawer when hamburger is clicked", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();
  });

  it("changes hamburger aria-label to Close menu when open", () => {
    render(<MobileNav user={null} dogs={[]} />);
    const hamburger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(hamburger);
    // Two close-menu buttons exist when open: hamburger + drawer X
    const closeBtns = screen.getAllByRole("button", { name: "Close menu" });
    expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    expect(closeBtns[0]).toHaveAttribute("aria-expanded", "true");
  });

  it("closes the drawer when the X button inside the drawer is clicked", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const closeButtons = screen.getAllByRole("button", { name: "Close menu" });
    // The inner close button is the second one (hamburger becomes "Close menu" too)
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});

describe("MobileNav — Escape key", () => {
  it("closes the drawer when Escape is pressed", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});

describe("MobileNav — backdrop", () => {
  it("closes the drawer when the backdrop is clicked", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    // Backdrop is the div with aria-hidden
    const backdrop = document.querySelector('[aria-hidden="true"][class*="fixed inset-0"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});

describe("MobileNav — body scroll lock", () => {
  it("sets overflow hidden on body when drawer opens", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body overflow when drawer closes", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });
});

describe("MobileNav — logged-out content", () => {
  it("shows public nav links when user is null", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recipes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
  });

  it("shows Sign in and Get started links when logged out", () => {
    render(<MobileNav user={null} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started →" })).toBeInTheDocument();
  });
});

describe("MobileNav — logged-in content", () => {
  it("shows dog names when user is logged in", () => {
    render(<MobileNav user={mockUser} dogs={mockDogs} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByText("Bella")).toBeInTheDocument();
    expect(screen.getByText("Rex")).toBeInTheDocument();
  });

  it("shows app nav links for logged-in users", () => {
    render(<MobileNav user={mockUser} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Planner" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toBeInTheDocument();
  });

  it("does not show public nav links when logged in", () => {
    render(<MobileNav user={mockUser} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.queryByRole("link", { name: "How it works" })).not.toBeInTheDocument();
  });
});

describe("MobileNav — active page", () => {
  it("applies semibold to the current route link", () => {
    mockPathname = "/planner";
    render(<MobileNav user={mockUser} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const plannerLink = screen.getByRole("link", { name: "Planner" });
    expect(plannerLink.className).toContain("font-semibold");
  });

  it("does not apply semibold to non-current route links", () => {
    mockPathname = "/planner";
    render(<MobileNav user={mockUser} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const kitchenLink = screen.getByRole("link", { name: "Kitchen" });
    expect(kitchenLink.className).not.toContain("font-semibold");
  });
});

describe("MobileNav — sign out", () => {
  it("calls supabase signOut and redirects to / when sign out is clicked", async () => {
    render(<MobileNav user={mockUser} dogs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const signOutBtn = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(signOutBtn);
    // Allow async signOut to resolve
    await vi.waitFor(() => expect(mockSignOut).toHaveBeenCalledOnce());
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
