import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteDogClient } from "@/components/dogs/DeleteDogClient";

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export default async function DeleteDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dog } = await supabase
    .from("dogs")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!dog) redirect("/dogs");

  const displayName = toTitleCase(dog.name as string | null);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Link
        href={`/dogs/${id}`}
        className="mb-10 inline-block text-sm font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
      >
        ← Back to {displayName}
      </Link>
      <DeleteDogClient dogId={id} displayName={displayName} initials={initials} />
    </div>
  );
}
