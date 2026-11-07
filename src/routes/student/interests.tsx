import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout, studentNav } from "@/components/layouts";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui-kit";
import { CITIES, COURSE_TYPES, DURATIONS, FIELDS } from "@/lib/data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/student/interests")({
  head: () => ({
    meta: [
      { title: "ความสนใจการเรียน | MapleLeaf Education" },
      { name: "description", content: "กรอกเมือง ประเภทหลักสูตร สาขา งบประมาณ และเป้าหมาย เพื่อให้ระบบแนะนำหลักสูตร" },
      { property: "og:title", content: "ความสนใจการเรียน | MapleLeaf Education" },
      { property: "og:description", content: "ให้ระบบจับคู่หลักสูตรในแคนาดาที่ตรงกับคุณ" },
    ],
  }),
  component: InterestsPage,
});

function InterestsPage() {
  const { myInterests, saveInterests } = useStore();
  const navigate = useNavigate();
  const cur = myInterests();
  const [f, setF] = useState({
    city: cur?.city ?? "",
    type: cur?.type ?? "",
    field: cur?.field ?? "",
    duration: cur?.duration ?? "",
    budget: cur?.budget ?? 15000,
    education: cur?.education ?? "",
    goal: cur?.goal ?? "",
  });
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string | number) => setF({ ...f, [k]: v });
  const valid = !!(f.city && f.type && f.field && f.duration && Number.isFinite(f.budget) && f.budget >= 1000 && f.education);

  return (
    <DashboardLayout nav={studentNav} title="Study Interests">
      <Card className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          ข้อมูลนี้ใช้จับคู่กับหลักสูตร ระบบจะแสดงหลักสูตรที่ตรงกับความสนใจของคุณพร้อมระดับภาษาที่แต่ละหลักสูตรต้องการ
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="เมืองที่ต้องการเรียน">
            <select className={inputClass} value={f.city} onChange={(e) => set("city", e.target.value)}>
              <option value="">เลือกเมือง</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="ประเภทหลักสูตร">
            <select className={inputClass} value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">เลือกประเภท</option>
              {COURSE_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="สาขาที่สนใจ">
            <select className={inputClass} value={f.field} onChange={(e) => set("field", e.target.value)}>
              <option value="">เลือกสาขา</option>
              {FIELDS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="ระยะเวลาเรียน">
            <select className={inputClass} value={f.duration} onChange={(e) => set("duration", e.target.value)}>
              <option value="">เลือกระยะเวลา</option>
              {DURATIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="งบประมาณค่าเรียน (CAD)">
            <input
              type="number"
              min={1000}
              step={100}
              className={inputClass}
              value={f.budget}
              onChange={(e) => set("budget", Number(e.target.value))}
            />
          </Field>
          <Field label="ระดับการศึกษาปัจจุบัน">
            <select className={inputClass} value={f.education} onChange={(e) => set("education", e.target.value)}>
              <option value="">เลือกระดับ</option>
              {["มัธยมปลาย", "ปวส./อนุปริญญา", "ปริญญาตรี", "ปริญญาโท"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <Field label="เป้าหมายในการเรียน" hint="เช่น ทำงานต่อในแคนาดา ขอ PR หรือพัฒนาภาษา">
            <textarea className={inputClass} rows={3} maxLength={500} value={f.goal} onChange={(e) => set("goal", e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={!valid}
            onClick={() => {
              saveInterests(f);
              setSaved(true);
            }}
          >
            บันทึกความสนใจ
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/student/courses" as never })}>
            ดูหลักสูตรที่แนะนำ
          </Button>
          {saved && <Badge tone="success">บันทึกแล้ว</Badge>}
        </div>
      </Card>
    </DashboardLayout>
  );
}
