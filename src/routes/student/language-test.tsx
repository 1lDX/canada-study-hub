import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout, studentNav } from "@/components/layouts";
import { Badge, Button, Card, Field, FileInput, inputClass } from "@/components/ui-kit";
import { LEVELS, TEST_TYPES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { isValidLanguageScore, isValidLanguageTestDates, languageScoreOptions, todayIso } from "@/lib/validation";

export const Route = createFileRoute("/student/language-test")({
  head: () => ({
    meta: [
      { title: "ผลสอบภาษา | MapleLeaf Education" },
      { name: "description", content: "บันทึกประเภทการสอบ คะแนน ระดับภาษา และอัปโหลดผลสอบเพื่อปลดล็อกการสมัครหลักสูตร" },
      { property: "og:title", content: "ผลสอบภาษา | MapleLeaf Education" },
      { property: "og:description", content: "ระบบจะเทียบระดับภาษาของคุณกับที่หลักสูตรกำหนดให้อัตโนมัติ" },
    ],
  }),
  component: LanguageTestPage,
});

function LanguageTestPage() {
  const { myTest, saveTest } = useStore();
  const cur = myTest();
  const [f, setF] = useState({
    testType: cur?.testType ?? "",
    score: cur?.score ?? "",
    level: cur?.level ?? "",
    testDate: cur?.testDate ?? "",
    expiryDate: cur?.expiryDate ?? "",
    fileName: cur?.fileName ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const scoreOptions = languageScoreOptions(f.testType, f.testDate);
  const datesOk = isValidLanguageTestDates(f.testDate, f.expiryDate);
  const valid = !!(f.testType && isValidLanguageScore(f.testType, f.score, f.testDate) && f.level && datesOk && f.fileName);

  return (
    <DashboardLayout nav={studentNav} title="Language Test">
      <Card className="max-w-3xl">
        {cur ? (
          <Badge tone="success">
            มีผลสอบในระบบแล้ว: {cur.testType} {cur.score} (ระดับ {cur.level})
          </Badge>
        ) : (
          <Badge tone="warning">ยังไม่มีผลสอบภาษา — จะยังสมัครหลักสูตรไม่ได้</Badge>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="ประเภทการสอบ">
            <select className={inputClass} value={f.testType} onChange={(e) => setF({ ...f, testType: e.target.value, score: "" })}>
              <option value="">เลือกประเภท</option>
              {TEST_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="คะแนน">
            <select className={inputClass} value={f.score} disabled={!scoreOptions.length} onChange={(e) => set("score", e.target.value)}>
              <option value="">{f.testType === "TOEFL iBT" && !f.testDate ? "เลือกวันสอบก่อน" : "เลือกคะแนน"}</option>
              {scoreOptions.map((score) => <option key={score}>{score}</option>)}
            </select>
          </Field>
          <Field label="ระดับภาษา (CEFR)">
            <select className={inputClass} value={f.level} onChange={(e) => set("level", e.target.value)}>
              <option value="">เลือกระดับ</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="วันที่สอบ">
            <input type="date" className={inputClass} max={todayIso()} value={f.testDate} onChange={(e) => setF({ ...f, testDate: e.target.value, score: "" })} />
          </Field>
          <Field label="วันหมดอายุ (ถ้ามี)">
            <input type="date" className={inputClass} min={f.testDate || undefined} value={f.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="อัปโหลดผลสอบ" hint="PDF หรือรูปภาพ ไม่เกิน 8 MB">
            <FileInput onFile={(file) => { setFile(file); set("fileName", file.name); }} value={f.fileName} />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            disabled={!valid}
            onClick={async () => {
              await saveTest({ testType: f.testType, score: f.score, level: f.level, testDate: f.testDate, expiryDate: f.expiryDate || undefined, file });
              setSaved(true);
            }}
          >
            บันทึกผลสอบภาษา
          </Button>
          {saved && <Badge tone="success">บันทึกแล้ว — ระบบอัปเดตหลักสูตรที่สมัครได้ให้คุณแล้ว</Badge>}
        </div>
      </Card>
    </DashboardLayout>
  );
}
