import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidPersonName } from "@/lib/validation";

export type ProfileRecord = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  org: string | null;
  role: "student" | "agent" | "college" | "admin" | null;
};

/**
 * Returns the account of the signed-in user. The first time someone signs in
 * (after signing up, or after the agency creates a staff account) the profile,
 * role and office rows are created here.
 *
 * Role comes from app_metadata, which only service-role code can write, so a
 * person registering on the site can never grant themselves agent or college.
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileRecord> => {
    const { supabase, userId } = context;

    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("id, firstname, lastname, email, org")
      .eq("id", userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    if (existing) {
      const { data: role, error: roleError } = await supabase.rpc("my_role");
      if (roleError) throw new Error(roleError.message);
      return {
        id: existing.id,
        firstname: existing.firstname,
        lastname: existing.lastname,
        email: existing.email,
        org: existing.org ?? null,
        role: (role ?? null) as ProfileRecord["role"],
      };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");

    const meta = (userData.user.user_metadata ?? {}) as Record<string, unknown>;
    const appMeta = (userData.user.app_metadata ?? {}) as Record<string, unknown>;
    const claimed = String(appMeta["portal_role"] ?? "student");
    const role: "student" | "agent" | "college" | "admin" =
      claimed === "agent" || claimed === "college" || claimed === "admin" ? claimed : "student";

    const email = userData.user.email ?? "";
    const firstname = String(meta["firstname"] ?? "").trim();
    const lastname = String(meta["lastname"] ?? "").trim();
    const org = meta["org"] ? String(meta["org"]).trim() : null;
    if (!isValidPersonName(firstname) || !isValidPersonName(lastname)) {
      throw new Error("ชื่อและนามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามเว้นวรรค, - และ '");
    }
    if ((role === "agent" || role === "college") && !org) {
      throw new Error("กรุณากรอกชื่อหน่วยงานหรือสถาบัน");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, firstname, lastname, email, org });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    if (roleError) throw new Error(roleError.message);

    if (role === "agent") {
      const { error } = await supabaseAdmin.from("agents").insert({ account_id: userId, agent_status: "active" });
      if (error) throw new Error(error.message);
    }
    if (role === "college") {
      const { error } = await supabaseAdmin.from("colleges").insert({ account_id: userId, college_name: org ?? "" });
      if (error) throw new Error(error.message);
    }

    return { id: userId, firstname, lastname, email, org, role };
  });
