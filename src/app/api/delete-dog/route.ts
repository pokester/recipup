import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAPIError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { dog_id } = await request.json();
    if (!dog_id) {
      return NextResponse.json({ message: "Dog ID is required" }, { status: 400 });
    }

    // Verify the dog belongs to the user
    const { data: dog, error: fetchError } = await supabase
      .from("dogs")
      .select("id")
      .eq("id", dog_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (fetchError || !dog) {
      return NextResponse.json({ message: "Dog not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("dogs")
      .update({ is_active: false })
      .eq("id", dog_id)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleAPIError(err);
  }
}
