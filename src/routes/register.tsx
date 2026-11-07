import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/layouts";
import { Button, Card, Field, inputClass } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { isValidEmail, isValidPassword, isValidPersonName } from "@/lib/validation";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "สมัครสมาชิก | MapleLeaf Education" },
      { name: "description", content: "สมัครสมาชิกฟรีเพื่อค้นหาหลักสูตรและยื่นใบสมัครเรียนต่อประเทศแคนาดา" },
      { property: "og:title", content: "สมัครสมาชิก | MapleLeaf Education" },
      { property: "og:description", content: "สร้างบัญชีนักเรียนเพื่อเริ่มสมัครหลักสูตรในแคนาดา" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useStore();
  const navigate = useNavigate();
  const [f, setF] = useState({ firstname: "", lastname: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const namesOk = isValidPersonName(f.firstname) && isValidPersonName(f.lastname);
  const emailOk = isValidEmail(f.email);
  const passwordOk = isValidPassword(f.password);
  const valid = namesOk && emailOk && passwordOk && f.password === f.confirm;

  const submit = async () => {
    if (!valid) return setError("กรุณาตรวจสอบชื่อ อีเมล และ Password ให้ถูกต้อง");
    const res = await register({ firstname: f.firstname.trim(), lastname: f.lastname.trim(), email: f.email.trim(), password: f.password });
    if (!res.ok) return setError(res.error ?? "สมัครไม่สำเร็จ");
    navigate({ to: "/student/dashboard" as never });
  };

  return (
    <PublicLayout>
      <div className="container-page grid place-items-center py-14">
        <Card className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold">สมัครสมาชิก Student</h1>
          <p className="mt-1 text-sm text-muted-foreground">Email ต้องไม่ซ้ำกับบัญชีที่มีอยู่</p>
          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ชื่อ">
                <input className={inputClass} maxLength={60} autoComplete="given-name" value={f.firstname} onChange={(e) => set("firstname", e.target.value)} />
              </Field>
              <Field label="นามสกุล">
                <input className={inputClass} maxLength={60} autoComplete="family-name" value={f.lastname} onChange={(e) => set("lastname", e.target.value)} />
              </Field>
            </div>
            <Field label="Email">
              <input type="email" className={inputClass} maxLength={255} autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Password" hint="อย่างน้อย 8 ตัว ต้องมีตัวพิมพ์ใหญ่และตัวพิมพ์เล็ก">
                <input type="password" className={inputClass} minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
              <Field label="ยืนยัน Password">
                <input type="password" className={inputClass} minLength={8} autoComplete="new-password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} />
              </Field>
            </div>
            {(f.firstname || f.lastname) && !namesOk && <p className="text-sm text-destructive">ชื่อและนามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามเว้นวรรค, - และ '</p>}
            {!!f.password && !passwordOk && <p className="text-sm text-destructive">Password ต้องมีอย่างน้อย 8 ตัว และมีตัวพิมพ์ใหญ่กับตัวพิมพ์เล็ก</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!!f.confirm && f.confirm !== f.password && <p className="text-sm text-destructive">รหัสผ่านไม่ตรงกัน</p>}
            <Button className="w-full" disabled={!valid} onClick={submit}>
              สมัครสมาชิก
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีแล้ว?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
