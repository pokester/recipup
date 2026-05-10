import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const isDev = process.env.NODE_ENV === "development";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { message: "Account deletion is not yet available. Please contact hello@recipup.co." },
        { status: 501 },
      );
    }

    const adminClient = createAdminClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isDev) console.error("delete-account error:", err);
    return NextResponse.json({ message: "Failed to delete account" }, { status: 500 });
  }
}
