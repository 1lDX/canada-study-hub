import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/layouts";
import { Badge, Button, Card, Field, SectionTitle, inputClass } from "@/components/ui-kit";
import { isValidContactName, isValidEmail } from "@/lib/validation";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "ติดต่อเรา | MapleLeaf Education" },
      { name: "description", content: "ติดต่อทีมที่ปรึกษาเรียนต่อแคนาดา สอบถามหลักสูตร ค่าใช้จ่าย และขั้นตอนการสมัคร" },
      { property: "og:title", content: "ติดต่อเรา | MapleLeaf Education" },
      { property: "og:description", content: "ส่งคำถามถึงที่ปรึกษาการศึกษาต่อแคนาดาของเรา" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "สอบถามหลักสูตร", message: "" });
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const valid = isValidContactName(form.name) && isValidEmail(form.email) && form.message.trim().length > 5;

  return (
    <PublicLayout>
      <div className="container-page py-12">
        <SectionTitle title="ติดต่อเรา" desc="ตอบกลับภายใน 1 วันทำการ" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            {sent ? (
              <div className="py-6 text-center">
                <Badge tone="success">ส่งข้อความเรียบร้อย</Badge>
                <p className="mt-3 text-sm text-muted-foreground">ทีมงานจะติดต่อกลับทางอีเมลที่คุณให้ไว้</p>
                <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>
                  ส่งข้อความใหม่
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="ชื่อ-นามสกุล">
                    <input className={inputClass} maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputClass} maxLength={255} value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                </div>
                <Field label="เรื่องที่ต้องการติดต่อ">
                  <select className={inputClass} value={form.topic} onChange={(e) => set("topic", e.target.value)}>
                    <option>สอบถามหลักสูตร</option>
                    <option>สอบถามค่าใช้จ่าย</option>
                    <option>สอบถามเรื่องวีซ่า</option>
                    <option>อื่น ๆ</option>
                  </select>
                </Field>
                <Field label="ข้อความ" hint="ไม่เกิน 1,000 ตัวอักษร">
                  <textarea
                    className={inputClass}
                    rows={5}
                    maxLength={1000}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                  />
                </Field>
                <Button disabled={!valid} onClick={() => setSent(true)}>
                  ส่งข้อความ
                </Button>
              </div>
            )}
          </Card>
          <Card>
            <p className="font-semibold">ช่องทางติดต่อ</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>อีเมล: hello@mapleleaf.example</p>
              <p>โทร: 02-000-0000</p>
              <p>LINE: @mapleleaf</p>
              <p>ออฟฟิศกรุงเทพฯ: อาคารตัวอย่าง ชั้น 12 ถนนสุขุมวิท</p>
              <p>ออฟฟิศโตรอนโต: 100 Maple St, Toronto, ON</p>
              <p className="pt-2">เวลาทำการ: จันทร์–ศุกร์ 09:00–18:00</p>
            </div>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
