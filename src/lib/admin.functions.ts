import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isValidEmail, isValidPassword, isValidPersonName } from "@/lib/validation";

/**
 * Admin is a minimal staff role: it manages accounts (create Agent/College
 * accounts, suspend/reactivate agents) but has NO access to application
 * contents. Every function here first verifies the caller really holds the
 * 'admin' role in user_roles (via has_role) before doing anything.
 */
export type ManagedRole = "agent" | "college";

export type ManagedAccount = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  org: string | null;
  role: ManagedRole;
  /** agent_status for agents; colleges have no status. */
  status: "active" | "suspended" | null;
  createdAt: string;
};

async function requireAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("เฉพาะบัญชี Admin เท่านั้นที่ใช้งานส่วนนี้ได้");
}

/** All agent and college accounts with their status, for the admin accounts page. */
export const listManagedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedAccount[]> => {
    await requireAdmin(context.supabase, context.userId);

    // Admin reads account data with the service-role client; the caller has
    // already been verified as an admin above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [roles, profiles, agents, colleges] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["agent", "college"]),
      supabaseAdmin.from("profiles").select("id, firstname, lastname, email, org, created_at"),
      supabaseAdmin.from("agents").select("account_id, agent_status, created_at"),
      supabaseAdmin.from("colleges").select("account_id, college_name, created_at"),
    ]);
    for (const r of [roles, profiles, agents, colleges]) {
      if (r.error) throw new Error(r.error.message);
    }

    const profileOf = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
    const agentOf = new Map((agents.data ?? []).map((a: any) => [a.account_id, a]));
    const collegeOf = new Map((colleges.data ?? []).map((c: any) => [c.account_id, c]));

    const rows: ManagedAccount[] = [];
    for (const r of roles.data ?? []) {
      const profile = profileOf.get(r.user_id);
      if (!profile) continue;
      const agent = agentOf.get(r.user_id);
      const college = collegeOf.get(r.user_id);
      rows.push({
        id: r.user_id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        email: profile.email,
        org: profile.org ?? college?.college_name ?? null,
        role: r.role as ManagedRole,
        status: agent ? (agent.agent_status as "active" | "suspended") : null,
        createdAt: agent?.created_at ?? college?.created_at ?? profile.created_at,
      });
    }
    rows.sort((a, b) => a.role.localeCompare(b.role) || a.createdAt.localeCompare(b.createdAt));
    return rows;
  });

/**
 * Creates an Agent or College account. The auth user is created with the email
 * confirmed and app_metadata.portal_role set to the chosen role, so the
 * existing ensureProfile flow creates the profile, role and agents/colleges
 * rows on the person's first sign-in. Creating 'admin' or 'student' accounts
 * here is never allowed.
 */
export const createManagedAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { email: string; password: string; firstname: string; lastname: string; org: string; role: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    if (data.role !== "agent" && data.role !== "college") {
      throw new Error("สร้างได้เฉพาะบัญชี Agent หรือ College เท่านั้น");
    }
    const firstname = data.firstname.trim();
    const lastname = data.lastname.trim();
    const org = data.org.trim();
    const email = data.email.trim().toLowerCase();
    if (!isValidPersonName(firstname) || !isValidPersonName(lastname)) {
      throw new Error("ชื่อและนามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามเว้นวรรค, - และ '");
    }
    if (!isValidEmail(email)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
    if (!org) throw new Error("กรุณากรอกชื่อหน่วยงานหรือสถาบัน");
    if (!isValidPassword(data.password)) throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวพิมพ์ใหญ่กับตัวพิมพ์เล็ก");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        firstname,
        lastname,
        org,
      },
      app_metadata: { portal_role: data.role },
    });
    if (error) {
      if (/already|registered|duplicate/i.test(error.message)) throw new Error("อีเมลนี้ถูกใช้สมัครแล้ว");
      throw new Error(error.message);
    }
    if (!created.user) throw new Error("สร้างบัญชีไม่สำเร็จ");

    // Create the profile, role and agents/colleges rows right away so the new
    // account shows up on the accounts page and can be managed before its
    // first sign-in. The existing ensureProfile flow keeps working: it sees the
    // existing profile and reuses it.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, firstname, lastname, email, org: org || null });
    if (profileError) throw new Error(profileError.message);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw new Error(roleError.message);
    if (data.role === "agent") {
      const { error } = await supabaseAdmin.from("agents").insert({ account_id: created.user.id, agent_status: "active" });
      if (error) throw new Error(error.message);
    }
    if (data.role === "college") {
      const { error } = await supabaseAdmin.from("colleges").insert({ account_id: created.user.id, college_name: org });
      if (error) throw new Error(error.message);
    }

    return { id: created.user.id, email };
  });

/** Suspends or re-activates an agent. Suspended agents stop receiving new applications. */
export const setAgentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { accountId: string; status: string }) => data)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    if (data.status !== "active" && data.status !== "suspended") throw new Error("สถานะไม่ถูกต้อง");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: agent, error: readError } = await supabaseAdmin
      .from("agents")
      .select("account_id")
      .eq("account_id", data.accountId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!agent) throw new Error("ไม่พบบัญชี Agent นี้");

    const { error } = await supabaseAdmin.from("agents").update({ agent_status: data.status }).eq("account_id", data.accountId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
