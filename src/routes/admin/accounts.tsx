import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout, adminNav } from "@/components/layouts";
import { Badge, Button, Card, Empty, Field, SectionTitle, Table, inputClass } from "@/components/ui-kit";
import { createManagedAccount, listManagedAccounts, setAgentStatus, type ManagedAccount } from "@/lib/admin.functions";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({
    meta: [
      { title: "จัดการบัญชี | MapleLeaf Education" },
      { name: "description", content: "สร้างบัญชี Agent และ College ระงับหรือเปิดกลับบัญชี Agent โดยผู้ดูแลระบบ" },
      { property: "og:title", content: "จัดการบัญชี | MapleLeaf Education" },
      { property: "og:description", content: "สร้างและจัดการบัญชี Agent และ College ของเอเจนซี่" },
    ],
  }),
  component: AdminAccounts,
});

type FormState = {
  role: "agent" | "college";
  firstname: string;
  lastname: string;
  email: string;
  org: string;
  password: string;
};

const emptyForm: FormState = { role: "agent", firstname: "", lastname: "", email: "", org: "", password: "" };

function AdminAccounts() {
  const [rows, setRows] = useState<ManagedAccount[] | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listManagedAccounts());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดรายชื่อบัญชีไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid =
    form.firstname.trim() &&
    form.lastname.trim() &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.password.length >= 8 &&
    (form.role === "college" ? true : true);

  const submit = async () => {
    setCreating(true);
    try {
      await createManagedAccount({ data: { ...form, email: form.email.trim() } });
      toast.success(`สร้างบัญชี ${form.role === "agent" ? "Agent" : "College"} สำเร็จ ให้ผู้ใช้เข้าสู่ระบบด้วยอีเมลนี้`);
      setForm(emptyForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (row: ManagedAccount) => {
    if (row.role !== "agent" || !row.status) return;
    const next = row.status === "active" ? "suspended" : "active";
    setToggling(row.id);
    try {
      await setAgentStatus({ data: { accountId: row.id, status: next } });
      toast.success(next === "suspended" ? "ระงับบัญชี Agent แล้ว" : "เปิดบัญชี Agent กลับแล้ว");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setToggling(null);
    }
  };

  return (
    <DashboardLayout nav={adminNav} title="จัดการบัญชี">
      <div className="space-y-8">
        <Card className="max-w-2xl">
          <SectionTitle title="สร้างบัญชีใหม่" desc="สร้างได้เฉพาะบัญชี Agent และ College (หน้าสมัครเว็บสำหรับ Student อยู่แล้ว)" />
          <div className="space-y-3">
            <Field label="ประเภทบัญชี">
              <select className={inputClass} value={form.role} onChange={(e) => set("role", e.target.value)}>
                <option value="agent">Agent</option>
                <option value="college">College</option>
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อ">
                <input className={inputClass} maxLength={60} value={form.firstname} onChange={(e) => set("firstname", e.target.value)} />
              </Field>
              <Field label="นามสกุล">
                <input className={inputClass} maxLength={60} value={form.lastname} onChange={(e) => set("lastname", e.target.value)} />
              </Field>
            </div>
            <Field label="Email">
              <input className={inputClass} maxLength={255} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="หน่วยงาน / สถาบัน" hint="บัญชี College ใช้ชื่อนี้เป็นชื่อสถาบัน">
              <input className={inputClass} maxLength={120} value={form.org} onChange={(e) => set("org", e.target.value)} />
            </Field>
            <Field label="รหัสผ่านเริ่มต้น" hint="อย่างน้อย 8 ตัวอักษร — บัญชีจะพร้อมใช้ทันที (ยืนยันอีเมลแล้ว)">
              <input type="password" className={inputClass} value={form.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            <Button disabled={!valid || creating} onClick={submit}>
              {creating ? "กำลังบันทึก..." : "สร้างบัญชี"}
            </Button>
          </div>
        </Card>

        <SectionTitle title="รายชื่อบัญชี Agent และ College" desc="ระงับบัญชี Agent เพื่อหยุดรับใบสมัครใหม่ และเปิดกลับได้เมื่อไหร่ก็ได้" />
        {!rows ? (
          <Empty>กำลังโหลดรายชื่อ...</Empty>
        ) : !rows.length ? (
          <Empty>ยังไม่มีบัญชี Agent หรือ College</Empty>
        ) : (
          <Table head={["ชื่อ", "อีเมล", "หน่วยงาน", "ประเภท", "สถานะ", "สร้างเมื่อ", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">
                  {r.firstname} {r.lastname}
                </td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.org || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.role === "agent" ? "primary" : "info"}>{r.role === "agent" ? "Agent" : "College"}</Badge>
                </td>
                <td className="px-4 py-3">
                  {r.role === "agent" ? (
                    r.status === "active" ? (
                      <Badge tone="success">พร้อมรับงาน</Badge>
                    ) : (
                      <Badge tone="danger">ถูกระงับ</Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {r.role === "agent" && (
                    <Button
                      size="sm"
                      variant={r.status === "active" ? "danger" : "success"}
                      disabled={toggling === r.id}
                      onClick={() => toggle(r)}
                    >
                      {toggling === r.id ? "..." : r.status === "active" ? "ระงับบัญชี" : "เปิดกลับ"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
}
