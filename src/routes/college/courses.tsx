import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout, collegeNav } from "@/components/layouts";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui-kit";
import { CITIES, COURSE_TYPES, DURATIONS, FIELDS, LEVELS, money } from "@/lib/data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/college/courses")({
  head: () => ({
    meta: [
      { title: "จัดการคอร์สเรียน | MapleLeaf Education" },
      { name: "description", content: "College เพิ่ม แก้ไข และปิดคอร์สเรียน" },
      { property: "og:title", content: "จัดการคอร์สเรียน | MapleLeaf Education" },
      { property: "og:description", content: "College เพิ่ม แก้ไข และปิดคอร์สเรียน" },
    ],
  }),
  component: ManageCourses,
});

type Row = {
  id: string; course_name: string; college_name: string; city: string; course_type: string; field: string;
  duration: string; tuition: number; language_level: string; intake: string; description: string; is_active: boolean;
};

const blank = (college: string): Row => ({
  id: "", course_name: "", college_name: college, city: CITIES[0]!, course_type: COURSE_TYPES[0]!, field: FIELDS[0]!,
  duration: DURATIONS[0]!, tuition: 0, language_level: "B1", intake: "", description: "", is_active: true,
});

function ManageCourses() {
  const { me } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const { data, error } = await supabase.from("courses").select("*").eq("college_id", me.id).order("course_name");
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as unknown as Row[]);
  }, [me]);
  useEffect(() => { void load(); }, [load]);

  if (!me) return null;
  const collegeName = me.org || `${me.firstname} ${me.lastname}`;

  const save = async () => {
    if (!edit) return;
    if (!edit.course_name.trim() || !edit.college_name.trim()) { toast.error("กรุณากรอกชื่อคอร์สและชื่อ College"); return; }
    if (!Number.isFinite(edit.tuition) || edit.tuition < 0) { toast.error("ค่าเรียนต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"); return; }
    setSaving(true);
    const payload = {
      course_name: edit.course_name.trim(), college_name: edit.college_name.trim(), city: edit.city,
      course_type: edit.course_type, field: edit.field, duration: edit.duration, tuition: Number(edit.tuition),
      language_level: edit.language_level, intake: edit.intake.trim(), description: edit.description.trim(),
      is_active: edit.is_active, college_id: me.id,
    };
    const { error } = edit.id
      ? await supabase.from("courses").update(payload).eq("id", edit.id)
      : await supabase.from("courses").insert({ ...payload, id: `C-${crypto.randomUUID().slice(0, 8)}` });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(edit.id ? "แก้ไขคอร์สแล้ว" : "เพิ่มคอร์สแล้ว");
    setEdit(null);
    void load();
  };

  const toggle = async (r: Row) => {
    if (r.is_active && !confirm(`ปิดคอร์ส "${r.course_name}"? นักเรียนจะไม่เห็นคอร์สนี้อีก (ใบสมัครเดิมยังอยู่)`)) return;
    const { error } = await supabase.from("courses").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const set = (k: keyof Row, v: string | number | boolean) => edit && setEdit({ ...edit, [k]: v });
  const sel = (k: keyof Row, opts: readonly string[]) => (
    <select className={inputClass} value={String(edit?.[k] ?? "")} onChange={(e) => set(k, e.target.value)}>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <DashboardLayout nav={collegeNav} title="จัดการคอร์สเรียน">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEdit(blank(collegeName))}>+ เพิ่มคอร์ส</Button>
      </div>

      {edit && (
        <Card className="mb-6">
          <p className="mb-3 font-semibold">{edit.id ? "แก้ไขคอร์ส" : "เพิ่มคอร์สใหม่"}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="ชื่อคอร์ส"><input className={inputClass} maxLength={160} value={edit.course_name} onChange={(e) => set("course_name", e.target.value)} /></Field>
            <Field label="ชื่อ College"><input className={inputClass} maxLength={120} value={edit.college_name} onChange={(e) => set("college_name", e.target.value)} /></Field>
            <Field label="เมือง">{sel("city", CITIES)}</Field>
            <Field label="ประเภทหลักสูตร">{sel("course_type", COURSE_TYPES)}</Field>
            <Field label="สาขา">{sel("field", FIELDS)}</Field>
            <Field label="ระยะเวลา">{sel("duration", DURATIONS)}</Field>
            <Field label="ระดับภาษาที่ต้องการ">{sel("language_level", LEVELS)}</Field>
            <Field label="ค่าเรียน (CAD)"><input type="number" min={0} step={0.01} className={inputClass} value={edit.tuition} onChange={(e) => set("tuition", Number(e.target.value))} /></Field>
            <Field label="รอบเปิดรับ"><input className={inputClass} maxLength={120} value={edit.intake} placeholder="เช่น Jan / May / Sep" onChange={(e) => set("intake", e.target.value)} /></Field>
            <Field label="สถานะ">
              <select className={inputClass} value={edit.is_active ? "1" : "0"} onChange={(e) => set("is_active", e.target.value === "1")}>
                <option value="1">เปิดรับสมัคร</option><option value="0">ปิด</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="รายละเอียด"><textarea rows={3} maxLength={2000} className={inputClass} value={edit.description} onChange={(e) => set("description", e.target.value)} /></Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
            <Button variant="outline" onClick={() => setEdit(null)}>ยกเลิก</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr><th className="p-3">คอร์ส</th><th className="p-3">เมือง</th><th className="p-3">ระดับภาษา</th><th className="p-3">ค่าเรียน</th><th className="p-3">สถานะ</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">ยังไม่มีคอร์ส</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><p className="font-medium">{r.course_name}</p><p className="text-xs text-muted-foreground">{r.course_type} · {r.duration}</p></td>
                <td className="p-3">{r.city}</td>
                <td className="p-3">{r.language_level}</td>
                <td className="p-3">{money(Number(r.tuition))}</td>
                <td className="p-3">{r.is_active ? <Badge tone="success">เปิดรับ</Badge> : <Badge>ปิด</Badge>}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setEdit({ ...r, tuition: Number(r.tuition) })}>แก้ไข</Button>{" "}
                  <Button size="sm" variant={r.is_active ? "danger" : "success"} onClick={() => toggle(r)}>{r.is_active ? "ปิด/ลบ" : "เปิดใหม่"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
