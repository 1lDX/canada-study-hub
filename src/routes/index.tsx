import { ALink } from "@/components/link";
import { useStore } from "@/lib/store";
import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/hero-canada.jpg";
import { PublicLayout } from "@/components/layouts";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui-kit";
import { money } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MapleLeaf Education – เอเจนซี่เรียนต่อแคนาดา" },
      {
        name: "description",
        content: "ค้นหาหลักสูตรในแคนาดา ตรวจระดับภาษาอัตโนมัติ ยื่นใบสมัครและติดตามสถานะได้ในที่เดียว",
      },
      { property: "og:title", content: "MapleLeaf Education – เอเจนซี่เรียนต่อแคนาดา" },
      { property: "og:description", content: "ระบบสมัครเรียนต่อแคนาดาแบบครบวงจรสำหรับนักเรียน เอเจนซี่ และคอลเลจ" },
    ],
  }),
  component: Home,
});

const steps = [
  { n: "1", t: "สมัครสมาชิกและกรอกความสนใจ", d: "เมือง ประเภทหลักสูตร สาขา งบประมาณ และเป้าหมายการเรียน" },
  { n: "2", t: "ระบบแนะนำหลักสูตรที่ตรงกับคุณ", d: "พร้อมบอกระดับภาษาที่แต่ละหลักสูตรต้องการ" },
  { n: "3", t: "ตรวจระดับภาษาและเอกสารอัตโนมัติ", d: "ระบบบอกว่าสมัครได้หรือยัง และเอกสารใดยังขาด" },
  { n: "4", t: "ติดตามสถานะจนถึงวันเดินทาง", d: "Offer, Invoice, การชำระเงิน และแจ้งเตือนในระบบ" },
];

function Home() {
  const COURSES = useStore().db.courses;
  const featured = COURSES.slice(0, 3);
  return (
    <PublicLayout showContact={false}>
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge tone="primary">เอเจนซี่เรียนต่อประเทศแคนาดา</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              เรียนต่อแคนาดา <span className="text-primary">ครบทุกขั้นตอน</span> ในระบบเดียว
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              ค้นหาหลักสูตรที่ตรงกับความสนใจ ให้ระบบตรวจระดับภาษาและความครบของเอกสารให้อัตโนมัติ
              แล้วติดตามสถานะใบสมัครได้เองโดยไม่ต้องโทรถามเอเจนต์
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton to="/register">เริ่มต้นสมัครเรียน</LinkButton>
              <LinkButton to="/courses" variant="outline">
                ดูหลักสูตรทั้งหมด
              </LinkButton>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-4">
              {[
                ["9+", "หลักสูตร"],
                ["6", "เมืองในแคนาดา"],
                ["100%", "ติดตามออนไลน์"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-semibold text-primary">{v}</p>
                  <p className="text-xs text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src={hero}
              alt="นักเรียนต่างชาติในแคมปัสประเทศแคนาดา"
              width={1600}
              height={1104}
              className="w-full rounded-2xl border border-border object-cover shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <SectionTitle title="ขั้นตอนการใช้งาน" desc="ระบบช่วยลดงาน Manual ของนักเรียน เอเจนต์ และคอลเลจ" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n}>
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 font-semibold text-primary">
                {s.n}
              </span>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-14">
        <div className="container-page">
          <SectionTitle
            title="หลักสูตรแนะนำ"
            desc="ทุกหลักสูตรแสดงระดับภาษาที่ต้องการอย่างชัดเจน"
            action={
              <LinkButton to="/courses" variant="outline" size="sm">
                ดูทั้งหมด
              </LinkButton>
            }
          />
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((c) => (
              <Card key={c.id}>
                <Badge tone="primary">{c.type}</Badge>
                <h3 className="mt-3 text-lg font-semibold">{c.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {c.college} · {c.city}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge>{c.duration}</Badge>
                  <Badge>{money(c.tuition)}</Badge>
                  <Badge tone="info">ต้องการ {c.level}</Badge>
                </div>
                <ALink to={`/courses/${c.id}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  ดูรายละเอียด →
                </ALink>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <Card className="bg-primary text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">พร้อมเริ่มต้นเส้นทางเรียนต่อแคนาดาแล้วหรือยัง</h2>
              <p className="mt-1 text-sm opacity-90">สมัครสมาชิกฟรี ใช้เวลาไม่ถึง 2 นาที</p>
            </div>
            <ALink
              to="/register"
              className="rounded-lg bg-card px-5 py-2.5 text-sm font-semibold text-primary hover:opacity-90"
            >
              สมัครสมาชิก
            </ALink>
          </div>
        </Card>
      </section>
    </PublicLayout>
  );
}
