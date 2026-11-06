import { ALink } from "@/components/link";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { DOC_TYPES, TIMELINE, formatDate, meetsLevel, money, type Course } from "@/lib/data";
import { missingDocs, useStore, type Application, type Role } from "@/lib/store";
import { downloadStoredFile } from "@/lib/uploads";
import { toast } from "sonner";
import { Badge, Button, Card, Empty, Field, FileInput, StatusBadge, Table, inputClass } from "./ui-kit";

/** Course details come from the database: courses are loaded once into the store. */
export function useCourseOf() {
  const { db } = useStore();
  return (id: string): Course | undefined => db.courses.find((c) => c.id === id);
}

export function useScopedApps(role: Role) {
  const { db, me } = useStore();
  if (!me) return [];
  if (role === "student") return db.applications.filter((a) => a.studentId === me.id);
  if (role === "agent") return db.applications;
  return db.applications.filter((a) => !!a.collegeId);
}

export function studentOf(app: Application) {
  const { db } = useStore();
  return db.accounts.find((a) => a.id === app.studentId);
}

export function ApplicationsTable({ role, apps }: { role: Role; apps: Application[] }) {
  const courseOf = useCourseOf();
  const { db } = useStore();
  if (!apps.length) return <Empty>ยังไม่มี Application ในรายการนี้</Empty>;
  return (
    <Table head={["Application", "นักเรียน", "หลักสูตร", "เอกสาร", "สถานะ", "ส่งเมื่อ", ""]}>
      {apps.map((a) => {
        const c = courseOf(a.courseId);
        const st = db.accounts.find((x) => x.id === a.studentId);
        const miss = missingDocs(a.docs);
        return (
          <tr key={a.id} className="hover:bg-surface">
            <td className="px-4 py-3 font-medium">{a.id}</td>
            <td className="px-4 py-3">{st ? `${st.firstname} ${st.lastname}` : "-"}</td>
            <td className="px-4 py-3">
              <p className="font-medium">{c?.name}</p>
              <p className="text-xs text-muted-foreground">
                {c?.college} · {c?.city}
              </p>
            </td>
            <td className="px-4 py-3">
              {miss.length ? <Badge tone="danger">ขาด {miss.length}</Badge> : <Badge tone="success">ครบ</Badge>}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={a.status} />
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(a.submittedAt)}</td>
            <td className="px-4 py-3 text-right">
              <ALink
                to={`/${role}/applications/${a.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                เปิดดู
              </ALink>
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export function AutoChecks({ app }: { app: Application }) {
  const courseOf = useCourseOf();
  const { db } = useStore();
  const course = courseOf(app.courseId)!;
  const test = db.tests[app.studentId];
  const miss = missingDocs(app.docs);
  const langOk = meetsLevel(test?.level, course.level);
  const infoOk = !!test && miss.length === 0;
  const rows = [
    { label: "ระดับภาษา", ok: langOk, detail: `Student ${test?.level ?? "-"} / ต้องการ ${course.level}` },
    { label: "เอกสารครบ", ok: miss.length === 0, detail: miss.length ? `ขาด ${miss.join(", ")}` : "ครบทุกรายการ" },
    { label: "ข้อมูลที่จำเป็น", ok: infoOk, detail: infoOk ? "ครบถ้วน" : "ข้อมูลยังไม่ครบ" },
  ];
  return (
    <Card>
      <p className="mb-3 font-semibold">ผลการตรวจสอบอัตโนมัติของระบบ</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2">
            <span className="text-sm font-medium">{r.label}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.detail}
              <Badge tone={r.ok ? "success" : "danger"}>{r.ok ? "ผ่าน" : "ไม่ผ่าน"}</Badge>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        ระบบตรวจความครบถ้วนให้เท่านั้น การตรวจความถูกต้องของเอกสารยังเป็นหน้าที่ของ Agent และ College
      </p>
    </Card>
  );
}

export function DocsList({ app }: { app: Application }) {
  return (
    <Card>
      <p className="mb-3 font-semibold">เอกสาร</p>
      <div className="space-y-2">
        {DOC_TYPES.map((d) => {
          const f = app.docs.find((x) => x.key === d.key);
          return (
            <div key={d.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
              <span className="text-sm">
                {d.label} {d.required && <span className="text-destructive">*</span>}
              </span>
              {f ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{f.fileName}</span>

                  {f.filePath && (

                    <button

                      type="button"

                      onClick={() => void downloadStoredFile("documents", f.filePath, f.fileName)}

                      className="font-medium text-primary hover:underline"

                    >

                      ดาวน์โหลด

                    </button>

                  )}
                  <Badge tone="success">อัปโหลดแล้ว</Badge>
                </span>
              ) : (
                <Badge tone={d.required ? "danger" : "muted"}>{d.required ? "ยังไม่มี" : "ไม่บังคับ"}</Badge>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function Timeline({ app }: { app: Application }) {
  const reached = new Set(app.history.map((h) => h.status));
  return (
    <Card>
      <p className="mb-4 font-semibold">Timeline สถานะ</p>
      <ol className="space-y-3">
        {TIMELINE.map((s) => {
          const done = reached.has(s);
          const current = app.status === s;
          return (
            <li key={s} className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <div>
                <p className={`text-sm ${current ? "font-semibold text-primary" : done ? "" : "text-muted-foreground"}`}>{s}</p>
                {done && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(app.history.find((h) => h.status === s)?.at)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {app.history.some((h) => h.status === "ส่งกลับให้แก้ไข") && (
        <p className="mt-3 text-xs text-destructive">มีรายการที่ถูกส่งกลับให้แก้ไขในประวัติการทำงาน</p>
      )}
    </Card>
  );
}

export function StudentSummary({ app }: { app: Application }) {
  const courseOf = useCourseOf();
  const { db } = useStore();
  const st = db.accounts.find((a) => a.id === app.studentId);
  const test = db.tests[app.studentId];
  const interest = db.interests[app.studentId];
  const c = courseOf(app.courseId)!;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <p className="mb-3 font-semibold">ข้อมูล Student</p>
        <dl className="space-y-1 text-sm">
          <Row k="ชื่อ" v={`${st?.firstname} ${st?.lastname}`} />
          <Row k="Email" v={st?.email ?? "-"} />
          <Row k="ระดับการศึกษา" v={interest?.education ?? "-"} />
          <Row k="เป้าหมาย" v={interest?.goal ?? "-"} />
        </dl>
        <p className="mb-2 mt-4 font-semibold">ผลสอบภาษา</p>
        <dl className="space-y-1 text-sm">
          <Row k="ประเภท" v={test?.testType ?? "-"} />
          <Row k="คะแนน" v={test?.score ?? "-"} />
          <Row k="ระดับ" v={test?.level ?? "-"} />
          <Row k="วันที่สอบ" v={test?.testDate ?? "-"} />
          <Row k="หมดอายุ" v={test?.expiryDate ?? "-"} />
          <Row k="ไฟล์" v={test?.fileName ?? "-"} />

          </dl>

          {test?.filePath && (

            <button

              type="button"

              onClick={() => void downloadStoredFile("results", test.filePath, test.fileName)}

              className="mt-2 text-xs font-medium text-primary hover:underline"

            >

              ดาวน์โหลดผลสอบ

            </button>

          )}
      </Card>
      <Card>
        <p className="mb-3 font-semibold">หลักสูตรที่สมัคร</p>
        <dl className="space-y-1 text-sm">
          <Row k="Course" v={c.name} />
          <Row k="College" v={c.college} />
          <Row k="เมือง" v={c.city} />
          <Row k="ระยะเวลา" v={c.duration} />
          <Row k="ค่าเรียน" v={money(c.tuition)} />
          <Row k="ระดับภาษาที่ต้องการ" v={c.level} />
          <Row k="Intake" v={c.intake} />
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
      </Card>
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

export function OfferInvoiceCard({ app }: { app: Application }) {
  if (!app.offer && !app.invoice) return <Empty>ยังไม่มี Offer หรือ Invoice สำหรับ Application นี้</Empty>;
  return (
    <Card>
      <p className="mb-3 font-semibold">Offer & Invoice</p>
      <dl className="space-y-1 text-sm">
        {app.offer && <Row k="Offer Letter" v={app.offer.fileName} />}
        {app.invoice && <Row k="Invoice" v={app.invoice.fileName} />}
        {app.invoice && <Row k="ยอดที่ต้องชำระ" v={money(app.invoice.amount)} />}
        {app.invoice && <Row k="กำหนดชำระ" v={app.invoice.dueDate} />}
        <Row k="ส่งถึงนักเรียนแล้ว" v={app.offer?.sentToStudent ? "ใช่" : "ยังไม่ส่ง"} />
      </dl>
      <div className="mt-3 flex gap-2">
        {app.offer && (
          <Button variant="outline" size="sm" onClick={() => void downloadStoredFile("offers", app.offer!.filePath, app.offer!.fileName)}>
            ดาวน์โหลด Offer
          </Button>
        )}
        {app.invoice && (
          <Button variant="outline" size="sm" onClick={() => void downloadStoredFile("invoices", app.invoice!.filePath, app.invoice!.fileName)}>
            ดาวน์โหลด Invoice
          </Button>
        )}
      </div>
    </Card>
  );
}

export function PaymentsCard({ app }: { app: Application }) {
  if (!app.payments.length) return <Empty>ยังไม่มีการชำระเงิน</Empty>;
  return (
    <Table head={["Payment", "จำนวนเงิน", "วันที่ชำระ", "หลักฐาน", "สถานะ"]}>
      {app.payments.map((p) => (
        <tr key={p.id}>
          <td className="px-4 py-3 font-medium">{p.id}</td>
          <td className="px-4 py-3">{money(p.amount)}</td>
          <td className="px-4 py-3">{p.paidDate}</td>
          <td className="px-4 py-3 text-xs text-muted-foreground">
            {p.fileName}
            {p.filePath && (
              <button
                type="button"
                onClick={() => void downloadStoredFile("payments", p.filePath, p.fileName)}
                className="ml-2 font-medium text-primary hover:underline"
              >
                เปิดดู
              </button>
            )}
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={p.status} />
            {p.note && <p className="mt-1 text-xs text-destructive">{p.note}</p>}
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function NoteAction({
  label,
  variant = "outline",
  onSubmit,
}: {
  label: string;
  variant?: "outline" | "danger" | "primary" | "success";
  onSubmit: (note: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  if (!open)
    return (
      <Button variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-surface p-3">
      <Field label="เหตุผล / สิ่งที่ต้องแก้ไข">
        <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={variant}
          disabled={!note.trim()}
          onClick={() => {
            onSubmit(note.trim());
            setOpen(false);
            setNote("");
          }}
        >
          ยืนยัน
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}

export function IssueOfferForm({ appId, amount }: { appId: string; amount: number }) {
  const { act, uploadAppFile } = useStore();
  const [offer, setOffer] = useState<{ fileName: string; filePath: string } | null>(null);
  const [invoice, setInvoice] = useState<{ fileName: string; filePath: string } | null>(null);
  const [amt, setAmt] = useState(amount);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const pick =
    (bucket: "offers" | "invoices", name: string, setter: (v: { fileName: string; filePath: string }) => void) =>
    async (file: File) => {
      setBusy(true);
      try {
        setter(await uploadAppFile(appId, bucket, name, file));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    };

  const submit = async () => {
    if (!offer || !invoice) return;
    setBusy(true);
    try {
      await act(appId, "college_issue_offer", { offer, invoice: { ...invoice, amount: amt, dueDate: due } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="mb-3 font-semibold">อนุมัติและออก Offer / Invoice</p>
      <div className="space-y-3">
        <Field label="Offer Letter (PDF)">
          <FileInput onFile={pick("offers", "offer", setOffer)} value={offer?.fileName} />
        </Field>
        <Field label="Invoice (PDF)">
          <FileInput onFile={pick("invoices", "invoice", setInvoice)} value={invoice?.fileName} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ยอดที่ต้องชำระ (CAD)">
            <input type="number" className={inputClass} value={amt} onChange={(e) => setAmt(Number(e.target.value))} />
          </Field>
          <Field label="กำหนดชำระ">
            <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <Button disabled={!offer || !invoice || !due || busy} onClick={() => void submit()}>
          {busy ? "กำลังบันทึก..." : "อนุมัติและอัปโหลดเอกสาร"}
        </Button>
      </div>
    </Card>
  );
}

export function NotificationsView() {
  const { db, me, markRead } = useStore();
  const list = db.notifications.filter((n) => n.accountId === me?.id);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => markRead()}>
          ทำเครื่องหมายว่าอ่านทั้งหมด
        </Button>
      </div>
      {!list.length && <Empty>ยังไม่มีการแจ้งเตือน</Empty>}
      {list.map((n) => (
        <Card key={n.id} className={n.read ? "" : "border-primary/40 bg-accent/40"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{n.title}</p>
            <span className="text-xs text-muted-foreground">{formatDate(n.at)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
          {!n.read && (
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => markRead(n.id)}>
              ทำเครื่องหมายว่าอ่าน
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
