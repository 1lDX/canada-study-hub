import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAYMENT_STATUSES, STATUSES } from "./data";

// Status strings come from the single source of truth (src/lib/data.ts) so the
// database dictionaries, the workflow and the screens can never drift apart.
const [PENDING, RETURNED, SENT_TO_COLLEGE, OFFERED, FORWARDED, AWAITING_PAYMENT, PAYMENT_CHECK, PAID, PREPARING, COMPLETED] =
  STATUSES;
const [PAYMENT_PENDING, PAYMENT_RETURNED, PAYMENT_AGENT_CHECKED, PAYMENT_CONFIRMED] = PAYMENT_STATUSES;

export type ApplicationAction =
  | "agent_return"
  | "student_resubmit"
  | "agent_send_college"
  | "college_request_info"
  | "college_issue_offer"
  | "agent_forward_docs"
  | "student_pay"
  | "agent_reject_payment"
  | "agent_verify_payment"
  | "college_confirm_payment"
  | "complete";

export type ActionPayload = {
  note?: string;
  offer?: { fileName: string; filePath: string };
  invoice?: { fileName: string; filePath: string; amount: number; dueDate: string };
  payment?: { amount: number; paidDate: string; fileName: string; filePath: string };
};

type ActorRole = "student" | "agent" | "college";

const ROLE_OF_ACTION: Record<ApplicationAction, ActorRole> = {
  agent_return: "agent",
  student_resubmit: "student",
  agent_send_college: "agent",
  college_request_info: "college",
  college_issue_offer: "college",
  agent_forward_docs: "agent",
  student_pay: "student",
  agent_reject_payment: "agent",
  agent_verify_payment: "agent",
  college_confirm_payment: "college",
  complete: "college",
};

const LABEL: Record<ActorRole, string> = { student: "Student", agent: "Agent", college: "College" };

type AppRow = {
  id: string;
  code: string;
  student_id: string;
  agent_id: string;
  college_id: string | null;
  course_id: string;
  status: string;
};

/** The middleware client (RLS as the caller) or the service-role client. */
type Client = SupabaseClient;

async function notify(supabase: Client, applicationId: string, userId: string, title: string, body: string) {
  const { error } = await supabase.rpc("post_notification", {
    _application_id: applicationId,
    _user_id: userId,
    _title: title,
    _body: body,
  });
  if (error) throw new Error(error.message);
}

async function notifyAgents(supabase: Client, applicationId: string, title: string, body: string) {
  const { data: agents, error } = await supabase.from("agents").select("account_id").eq("agent_status", "active");
  if (error) throw new Error(error.message);
  await Promise.all((agents ?? []).map((agent) => notify(supabase, applicationId, agent.account_id, title, body)));
}

async function addHistory(
  supabase: Client,
  row: { application_id: string; status: string; note?: string | undefined; actor_id: string; actor_label: string },
) {
  const { error } = await supabase.from("application_history").insert(row);
  if (error) throw new Error(error.message);
}

async function setStatus(supabase: Client, app: AppRow, status: string, actorId: string, actorLabel: string, note?: string) {
  const { error } = await supabase.from("applications").update({ status }).eq("id", app.id);
  if (error) throw new Error(error.message);
  await addHistory(supabase, { application_id: app.id, status, note, actor_id: actorId, actor_label: actorLabel });
}

/**
 * Student submits a course application. Documents that were staged while filling in the
 * form are moved into the application folder, the first status is recorded, and both the
 * student and all active agents are notified.
 */
export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string; docs: { key: string; fileName: string; filePath: string }[] }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isStudent, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "student",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isStudent) throw new Error("เฉพาะบัญชีนักเรียนเท่านั้นที่สมัครหลักสูตรได้");

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("account_id")
      .eq("agent_status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (agentError) throw new Error(agentError.message);
    if (!agent) throw new Error("ยังไม่มีบัญชี Agent ที่พร้อมรับใบสมัคร");

    const { data: created, error: insertError } = await supabase
      .from("applications")
      .insert({ student_id: userId, course_id: data.courseId, agent_id: agent.account_id, status: PENDING })
      .select("id, code")
      .single();
    if (insertError) {
      if (insertError.message.includes("Language level")) {
        throw new Error("ระดับภาษาของคุณยังไม่ผ่านเกณฑ์ของหลักสูตรนี้");
      }
      throw new Error(insertError.message);
    }

    for (const doc of data.docs) {
      if (!doc.filePath.startsWith(`${userId}/staging/`)) {
        throw new Error("ข้อมูลไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่อีกครั้ง");
      }
      const ext = doc.fileName.split(".").pop()?.toLowerCase() || "pdf";
      const target = `${created.id}/${doc.key}.${ext}`;
      const { error: copyError } = await supabase.storage.from("documents").copy(doc.filePath, target);
      if (copyError) throw new Error(`ย้ายไฟล์ ${doc.fileName} ไม่สำเร็จ: ${copyError.message}`);
      const { error: docError } = await supabase.from("application_documents").insert({
        application_id: created.id,
        doc_key: doc.key,
        file_name: doc.fileName,
        file_path: target,
        uploaded_by: userId,
      });
      if (docError) throw new Error(docError.message);
      await supabase.storage.from("documents").remove([doc.filePath]);
    }

    await addHistory(supabase, { application_id: created.id, status: PENDING, actor_id: userId, actor_label: LABEL.student });
    await notifyAgents(supabase, created.id, "Application ใหม่", `${created.code} รอการตรวจสอบ`);
    await notify(supabase, created.id, userId, "ส่ง Application แล้ว", `${created.code} ถูกส่งให้ Agent เรียบร้อย`);

    return { id: created.code, uuid: created.id };
  });

/**
 * The workflow engine. Every status change goes through here so the acting role is
 * checked against the database, the history is written, and the right accounts are
 * notified — no screen can move an application to a state its role is not allowed to.
 */
export const runApplicationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appId: string; action: ApplicationAction } & ActionPayload) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = ROLE_OF_ACTION[data.action];
    if (!role) throw new Error("ไม่รู้จักขั้นตอนนี้");

    const { data: hasRole, error: roleError } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (roleError) throw new Error(roleError.message);
    if (!hasRole) throw new Error("บัญชีของคุณไม่มีสิทธิ์ดำเนินการขั้นตอนนี้");

    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, code, student_id, agent_id, college_id, course_id, status")
      .eq("id", data.appId)
      .maybeSingle();
    if (appError) throw new Error(appError.message);
    if (!app) throw new Error("ไม่พบใบสมัครนี้ หรือคุณไม่มีสิทธิ์ดำเนินการ");

    const belongs = role === "student" ? app.student_id === userId : role === "agent" ? true : app.college_id === userId;
    if (!belongs) throw new Error("ใบสมัครนี้อยู่ในความดูแลของเจ้าหน้าที่คนอื่น");

    switch (data.action) {
      case "agent_return": {
        await setStatus(supabase, app, RETURNED, userId, LABEL.agent, data.note);
        await notify(supabase, app.id, app.student_id, "ต้องแก้ไข Application", `${app.code}: ${data.note ?? "กรุณาตรวจสอบเอกสาร"}`);
        break;
      }
      case "student_resubmit": {
        await setStatus(supabase, app, PENDING, userId, LABEL.student);
        await notifyAgents(supabase, app.id, "Student แก้ไข Application", `${app.code} ถูกส่งกลับมาตรวจสอบอีกครั้ง`);
        break;
      }
      case "agent_send_college": {
        const { data: course, error: courseError } = await supabase
          .from("courses")
          .select("college_name")
          .eq("id", app.course_id)
          .maybeSingle();
        if (courseError) throw new Error(courseError.message);
        const { data: college, error: collegeError } = await supabase
          .from("colleges")
          .select("account_id")
          .eq("college_name", course?.college_name ?? "")
          .maybeSingle();
        if (collegeError) throw new Error(collegeError.message);
        if (!college) throw new Error(`ยังไม่มีบัญชี College ของ ${course?.college_name ?? "สถาบันนี้"}`);

        const { error: linkError } = await supabase.from("applications").update({ college_id: college.account_id }).eq("id", app.id);
        if (linkError) throw new Error(linkError.message);
        await setStatus(supabase, app, SENT_TO_COLLEGE, userId, LABEL.agent);
        await notify(supabase, app.id, college.account_id, "Application ใหม่จาก Agent", `${app.code} ถูกส่งมาให้ College ตรวจสอบ`);
        await notify(supabase, app.id, app.student_id, "Application ผ่านการตรวจสอบ", `${app.code} ถูกส่งให้ College แล้ว`);
        break;
      }
      case "college_request_info": {
        await setStatus(supabase, app, RETURNED, userId, LABEL.college, data.note);
        await notifyAgents(supabase, app.id, "College ขอข้อมูลเพิ่มเติม", `${app.code}: ${data.note ?? ""}`);
        await notify(supabase, app.id, app.student_id, "ต้องแก้ไข Application", `${app.code}: ${data.note ?? ""}`);
        break;
      }
      case "college_issue_offer": {
        if (!data.offer || !data.invoice) throw new Error("ต้องมี Offer และ Invoice ก่อนอนุมัติ");
        const { error: offerError } = await supabase
          .from("offers")
          .upsert(
            { application_id: app.id, file_name: data.offer.fileName, file_path: data.offer.filePath },
            { onConflict: "application_id" },
          );
        if (offerError) throw new Error(offerError.message);
        const { error: invoiceError } = await supabase
          .from("invoices")
          .upsert(
            {
              application_id: app.id,
              file_name: data.invoice.fileName,
              file_path: data.invoice.filePath,
              amount: data.invoice.amount,
              due_date: data.invoice.dueDate,
            },
            { onConflict: "application_id" },
          );
        if (invoiceError) throw new Error(invoiceError.message);
        await setStatus(supabase, app, OFFERED, userId, LABEL.college);
        await notifyAgents(supabase, app.id, "College อัปโหลด Offer & Invoice", `${app.code} พร้อมส่งต่อให้นักเรียน`);
        break;
      }
      case "agent_forward_docs": {
        for (const bucket of ["offers", "invoices"] as const) {
          const { error } = await supabase.from(bucket).update({ sent_to_student: true }).eq("application_id", app.id);
          if (error) throw new Error(error.message);
        }
        await setStatus(supabase, app, AWAITING_PAYMENT, userId, LABEL.agent);
        await addHistory(supabase, { application_id: app.id, status: FORWARDED, actor_id: userId, actor_label: LABEL.agent });
        await notify(supabase, app.id, app.student_id, "มี Offer และ Invoice", `${app.code}: ดาวน์โหลดเอกสารและชำระเงินได้แล้ว`);
        break;
      }
      case "student_pay": {
        const payment = data.payment;
        if (!payment) throw new Error("ต้องมีหลักฐานการชำระเงิน");
        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("amount")
          .eq("application_id", app.id)
          .maybeSingle();
        if (invoiceError) throw new Error(invoiceError.message);
        if (!invoice) throw new Error("ยังไม่มี Invoice: " + app.code);
        if (Number(payment.amount) !== Number(invoice.amount)) {
          throw new Error(
            `Amount does not match Invoice ${app.code}: expected ${Number(invoice.amount).toLocaleString("en-CA")} CAD`,
          );
        }
        const { error: paymentError } = await supabase.from("payments").insert({
          application_id: app.id,
          amount: payment.amount,
          paid_date: payment.paidDate,
          file_name: payment.fileName,
          file_path: payment.filePath,
          status: PAYMENT_PENDING,
          submitted_by: userId,
        });
        if (paymentError) throw new Error(paymentError.message);
        await setStatus(supabase, app, PAYMENT_CHECK, userId, LABEL.student);
        await notifyAgents(supabase, app.id, "Student ส่ง Payment", `${app.code} ยอด ${payment.amount} รอตรวจสอบ`);
        break;
      }
      case "agent_reject_payment": {
        const { error } = await supabase
          .from("payments")
          .update({ status: PAYMENT_RETURNED, note: data.note ?? null })
          .eq("application_id", app.id)
          .eq("status", PAYMENT_PENDING);
        if (error) throw new Error(error.message);
        await setStatus(supabase, app, AWAITING_PAYMENT, userId, LABEL.agent, data.note);
        await notify(supabase, app.id, app.student_id, "Payment มีปัญหา", `${app.code}: ${data.note ?? "หลักฐานไม่ถูกต้อง"}`);
        break;
      }
      case "agent_verify_payment": {
        const { error } = await supabase
          .from("payments")
          .update({ status: PAYMENT_AGENT_CHECKED })
          .eq("application_id", app.id)
          .eq("status", PAYMENT_PENDING);
        if (error) throw new Error(error.message);
        await setStatus(supabase, app, PAID, userId, LABEL.agent);
        const target = app.college_id ?? app.student_id;
        await notify(supabase, app.id, target, "Agent ส่งข้อมูล Payment", `${app.code} รอ College ยืนยัน`);
        await notify(supabase, app.id, app.student_id, "Payment ผ่านการตรวจสอบ", `${app.code} ส่งให้ College ยืนยันแล้ว`);
        break;
      }
      case "college_confirm_payment": {
        const { error } = await supabase
          .from("payments")
          .update({ status: PAYMENT_CONFIRMED })
          .eq("application_id", app.id)
          .eq("status", PAYMENT_AGENT_CHECKED);
        if (error) throw new Error(error.message);
        await setStatus(supabase, app, PREPARING, userId, LABEL.college);
        await notify(supabase, app.id, app.student_id, "ชำระเงินเรียบร้อย", `${app.code} College ${PREPARING}`);
        await notifyAgents(supabase, app.id, "College ยืนยันการชำระเงิน", `${app.code} ${PREPARING}`);
        break;
      }
      case "complete": {
        await setStatus(supabase, app, COMPLETED, userId, LABEL.college);
        await notify(supabase, app.id, app.student_id, "ขั้นตอนเสร็จสิ้น", `${app.code} ${COMPLETED}`);
        await notifyAgents(supabase, app.id, "Application เสร็จสิ้น", `${app.code} ปิดเคสเรียบร้อย`);
        break;
      }
    }

    return { ok: true };
  });
