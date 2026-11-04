import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/layouts";
import { Button, Card, Field, inputClass } from "@/components/ui-kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | MapleLeaf Education" },
      { name: "description", content: "เข้าสู่ระบบเพื่อสมัครหลักสูตรและติดตามสถานะใบสมัครเรียนต่อแคนาดา" },
      { property: "og:title", content: "เข้าสู่ระบบ | MapleLeaf Education" },
      { property: "og:description", content: "เข้าสู่ระบบสำหรับนักเรียน เอเจนต์ และคอลเลจ" },
    ],
  }),
  component: LoginPage,
});

const demos: [string, string][] = [
  ["student@demo.com", "Student"],
  ["agent@demo.com", "Agent"],
  ["college@demo.com", "College"],
  ["admin@demo.com", "Admin"],
];

function LoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    const acc = await login(email.trim(), password);
    if (!acc) return setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    navigate({ to: `/${acc.role}/dashboard` as never });
  };

  return (
    <PublicLayout>
      <div className="container-page grid place-items-center py-14">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-muted-foreground">สำหรับ Student, Agent และ College</p>
          <div className="mt-5 space-y-3">
            <Field label="Email">
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={submit} disabled={!email || !password}>
              เข้าสู่ระบบ
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ยังไม่มีบัญชี?{" "}
              <Link to="/register" className="font-medium text-primary hover:underline">
                สมัครสมาชิก
              </Link>
            </p>
          </div>
          <div className="mt-6 rounded-lg bg-surface p-3">
            <p className="text-xs font-medium">บัญชีทดลอง (รหัสผ่าน MapleDemo#2026)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {demos.map(([em, label]) => (
                <Button
                  key={em}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEmail(em);
                    setPassword("MapleDemo#2026");
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
