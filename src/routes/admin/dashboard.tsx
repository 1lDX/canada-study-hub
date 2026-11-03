import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout, adminNav } from "@/components/layouts";
import { Button, Card, SectionTitle, Stat } from "@/components/ui-kit";
import { listManagedAccounts, type ManagedAccount } from "@/lib/admin.functions";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | MapleLeaf Education" },
      { name: "description", content: "ภาพรวมบัญชี Agent และ College ของผู้ดูแลระบบ MapleLeaf Education" },
      { property: "og:title", content: "Admin Dashboard | MapleLeaf Education" },
      { property: "og:description", content: "ภาพรวมบัญชี Agent และ College สำหรับผู้ดูแลระบบ" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [rows, setRows] = useState<ManagedAccount[] | null>(null);

  useEffect(() => {
    listManagedAccounts()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"));
  }, []);

  const agents = rows?.filter((r) => r.role === "agent") ?? [];
  const colleges = rows?.filter((r) => r.role === "college") ?? [];
  const active = agents.filter((a) => a.status === "active").length;
  const suspended = agents.filter((a) => a.status === "suspended").length;

  return (
    <DashboardLayout nav={adminNav} title="Admin Dashboard">
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Agent ทั้งหมด" value={rows ? agents.length : "…"} tone="text-primary" />
        <Stat label="Agent พร้อมรับงาน" value={rows ? active : "…"} />
        <Stat label="Agent ถูกระงับ" value={rows ? suspended : "…"} />
        <Stat label="College ทั้งหมด" value={rows ? colleges.length : "…"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="font-semibold">จัดการบัญชี</p>
          <p className="mt-2 text-sm text-muted-foreground">
            สร้างบัญชี Agent / College ใหม่ และระงับหรือเปิดกลับบัญชี Agent ได้จากหน้าจัดการบัญชี
          </p>
          <Button size="sm" className="mt-3" onClick={() => (window.location.href = "/admin/accounts")}>
            ไปหน้าจัดการบัญชี
          </Button>
        </Card>
        <Card>
          <p className="font-semibold">ขอบเขตสิทธิ์ Admin</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin ดูแลบัญชีเท่านั้น ไม่สามารถเปิดดูเนื้อหาใบสมัคร เอกสาร Offer Invoice หรือการชำระเงินของนักเรียนได้
          </p>
        </Card>
      </div>

      {rows && (
        <div className="mt-8">
          <SectionTitle title="บัญชีล่าสุด" desc="อัปเดต {formatDate(rows[0]?.createdAt ?? "")}" />
        </div>
      )}
    </DashboardLayout>
  );
}
