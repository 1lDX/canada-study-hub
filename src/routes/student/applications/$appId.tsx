import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout, studentNav } from "@/components/layouts";
import {
  AutoChecks,
  DocsList,
  OfferInvoiceCard,
  PaymentsCard,
  StudentSummary,
  Timeline,
} from "@/components/application-views";
import { Badge, Button, Card, Empty, Field, FileInput, SectionTitle, StatusBadge, inputClass } from "@/components/ui-kit";
import { DOC_TYPES, formatDate, money } from "@/lib/data";
import { missingDocs, useStore } from "@/lib/store";
import { isFinitePositive, isNotFutureDate, todayIso } from "@/lib/validation";

export const Route = createFileRoute("/student/applications/$appId")({
  head: () => ({
    meta: [
      { title: "รายละเอียดใบสมัคร | MapleLeaf Education" },
      { name: "description", content: "ดู Timeline สถานะ เอกสาร Offer Invoice และการชำระเงินของใบสมัคร" },
      { property: "og:title", content: "รายละเอียดใบสมัคร | MapleLeaf Education" },
      { property: "og:description", content: "ติดตามทุกขั้นตอนของใบสมัครเรียนต่อแคนาดา" },
    ],
  }),
  component: AppDetail,
});

function AppDetail() {
  const { appId } = Route.useParams();
  const { db, me, act, uploadDoc, uploadAppFile } = useStore();
  const app = db.applications.find((a) => a.id === appId && a.studentId === me?.id);
  const [pay, setPay] = useState<{ amount: number; paidDate: string; file: File | null }>({ amount: 0, paidDate: "", file: null });
  const [payError, setPayError] = useState("");

  if (!app)
    return (
      <DashboardLayout nav={studentNav} title="Application">
        <Empty>ไม่พบใบสมัครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</Empty>
      </DashboardLayout>
    );

  const miss = missingDocs(app.docs);
  const needsFix = app.status === "ส่งกลับให้แก้ไข";
  const invoice = app.invoice;
  const canPay = invoice?.sentToStudent && ["รอชำระเงิน"].includes(app.status);

  const submitPay = async () => {
    if (!invoice) return;
    if (!isFinitePositive(pay.amount)) {
      setPayError("จำนวนเงินต้องมากกว่า 0");
      return;
    }
    if (!isNotFutureDate(pay.paidDate)) {
      setPayError("วันที่ชำระต้องไม่เป็นวันในอนาคต");
      return;
    }
    if (pay.amount !== invoice.amount) {
      setPayError(`ยอดเงินไม่ตรงกับ Invoice (ต้องชำระ ${money(invoice.amount)})`);
      return;
    }
    setPayError("");
    if (!pay.file) return;
    try {
      const up = await uploadAppFile(app.id, "payments", `payment-${Date.now()}`, pay.file);
      await act(app.id, "student_pay", { payment: { amount: pay.amount, paidDate: pay.paidDate, ...up } });
      setPay({ amount: 0, paidDate: "", file: null });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    }
  };

  return (
    <DashboardLayout nav={studentNav} title={`Application ${app.id}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={app.status} />
        <span className="text-sm text-muted-foreground">ส่งเมื่อ {formatDate(app.submittedAt)}</span>
      </div>

      {needsFix && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <p className="font-semibold text-destructive">ใบสมัครถูกส่งกลับให้แก้ไข</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[...app.history].reverse().find((h) => h.status === "ส่งกลับให้แก้ไข")?.note ?? "กรุณาตรวจสอบเอกสารและส่งอีกครั้ง"}
          </p>
          <div className="mt-4 space-y-3">
            {DOC_TYPES.map((d) => (
              <Field key={d.key} label={d.label}>
                <FileInput
                  value={app.docs.find((x) => x.key === d.key)?.fileName}
                  onFile={(file) => void uploadDoc(app.id, { key: d.key, file })}
                />
              </Field>
            ))}
          </div>
          <Button className="mt-4" disabled={miss.length > 0} onClick={() => act(app.id, "student_resubmit")}>
            ส่งใบสมัครอีกครั้ง
          </Button>
          {!!miss.length && <p className="mt-2 text-xs text-destructive">ขาด {miss.join(", ")}</p>}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <StudentSummary app={app} />
          <AutoChecks app={app} />
          <DocsList app={app} />
          <div>
            <SectionTitle title="Offer & Invoice" />
            {invoice?.sentToStudent || app.offer?.sentToStudent ? (
              <OfferInvoiceCard app={app} />
            ) : (
              <Empty>ยังไม่มีเอกสารจาก College ที่ส่งถึงคุณ</Empty>
            )}
          </div>
          <div>
            <SectionTitle title="การชำระเงิน" />
            <PaymentsCard app={app} />
            {canPay && invoice && (
              <Card className="mt-4">
                <p className="font-semibold">แจ้งชำระเงิน</p>
                <p className="mt-1 text-sm text-muted-foreground">ยอดที่ต้องชำระ {money(invoice.amount)} · กำหนด {invoice.dueDate}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="จำนวนเงินที่ชำระ (CAD)">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      className={inputClass}
                      value={pay.amount || ""}
                      onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="วันที่ชำระ">
                    <input type="date" className={inputClass} max={todayIso()} value={pay.paidDate} onChange={(e) => setPay({ ...pay, paidDate: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="หลักฐานการชำระเงิน">
                    <FileInput onFile={(file) => setPay({ ...pay, file })} value={pay.file?.name} />
                  </Field>
                </div>
                {payError && <Badge tone="danger">{payError}</Badge>}
                <Button className="mt-3" disabled={!isFinitePositive(pay.amount) || !isNotFutureDate(pay.paidDate) || !pay.file} onClick={submitPay}>
                  ส่งหลักฐานการชำระเงิน
                </Button>
              </Card>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <Timeline app={app} />
          <Card>
            <p className="mb-2 font-semibold">ประวัติการดำเนินการ</p>
            <ol className="space-y-2 text-sm">
              {[...app.history].reverse().map((h, idx) => (
                <li key={idx} className="border-b border-border/60 pb-2 last:border-0">
                  <p className="font-medium">{h.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.by} · {formatDate(h.at)}
                  </p>
                  {h.note && <p className="text-xs text-destructive">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
