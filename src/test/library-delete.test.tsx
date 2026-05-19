import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LibraryClient } from "@/components/library/LibraryClient";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  }),
}));

const makeRecipe = (id: string) => ({
  id,
  dog_id: "dog-1",
  recipe_data: {
    name: `Test Recipe ${id}`,
    tagline: "A test recipe",
    method: "one_pot" as const,
    safety_score: 90,
  },
  is_favourite: false,
  saved_at: new Date().toISOString(),
  dogs: { name: "Bella" },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LibraryClient — inline delete confirmation", () => {
  it("does not use window.confirm when delete is clicked", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<LibraryClient initialRecipes={[makeRecipe("r1")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from library" }));
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("shows an inline confirmation when delete is clicked", async () => {
    render(<LibraryClient initialRecipes={[makeRecipe("r1")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from library" }));
    expect(screen.getByRole("button", { name: "Confirm remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("removes the recipe after inline confirm", async () => {
    render(<LibraryClient initialRecipes={[makeRecipe("r1")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from library" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => {
      expect(screen.queryByText("Test Recipe r1")).not.toBeInTheDocument();
    });
  });

  it("keeps the recipe after inline cancel", async () => {
    render(<LibraryClient initialRecipes={[makeRecipe("r1")]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove from library" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Test Recipe r1")).toBeInTheDocument();
  });

  it("only shows confirmation for the clicked recipe when multiple exist", async () => {
    render(<LibraryClient initialRecipes={[makeRecipe("r1"), makeRecipe("r2")]} />);
    const deleteButtons = screen.getAllByRole("button", { name: "Remove from library" });
    fireEvent.click(deleteButtons[0]);
    // Only one inline confirm row should appear
    expect(screen.getAllByRole("button", { name: "Confirm remove" })).toHaveLength(1);
  });
});
