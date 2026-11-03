import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile, type ProfileRecord } from "./auth.functions";
import {
  runApplicationAction,
  submitApplication,
  type ActionPayload,
  type ApplicationAction,
} from "./portal.functions";
import { DOC_TYPES, STATUSES, meetsLevel, type Course, type PaymentStatus, type Status } from "./data";
import { extensionOf, uploadFile } from "./uploads";

export type Role = "student" | "agent" | "college";

/** A person the signed-in account is allowed to see (own profile, or linked students). */
export type Person = { id: string; firstname: string; lastname: string; email: string; org?: string | null };
export type Account = Person & { role: Role };

export type Interests = {
  city: string;
  type: string;
  field: string;
  duration: string;
  budget: number;
  education: string;
  goal: string;
};

export type LanguageTest = {
  testType: string;
  score: string;
  level: string;
  testDate: string;
  expiryDate?: string | undefined;
  fileName: string;
  filePath: string;
};

export type Doc = { key: string; fileName: string; filePath: string; uploadedAt: string };

export type Payment = {
  id: string;
  amount: number;
  paidDate: string;
  fileName: string;
  filePath: string;
  status: PaymentStatus;
  note?: string | undefined;
};

export type Application = {
  id: string;
  uuid: string;
  studentId: string;
  courseId: string;
  agentId: string;
  collegeId?: string | undefined;
  status: Status;
  submittedAt: string;
  docs: Doc[];
  history: { status: Status | string; at: string; by: string; note?: string | undefined }[];
  offer?: { fileName: string; filePath: string; at: string; sentToStudent?: boolean | undefined } | undefined;
  invoice?:
    | { fileName: string; filePath: string; amount: number; dueDate: string; at: string; sentToStudent?: boolean | undefined }
    | undefined;
  payments: Payment[];
};

export type Notification = {
  id: string;
  accountId: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
};

export type DB = {
  accounts: Person[];
  courses: Course[];
  applications: Application[];
  interests: Record<string, Interests>;
  tests: Record<string, LanguageTest>;
  notifications: Notification[];
};

const APP_SELECT = `id, code, student_id, agent_id, college_id, course_id, status, submitted_at,
  application_documents ( doc_key, file_name, file_path, uploaded_at ),
  application_history ( status, note, actor_label, created_at ),
  offers ( file_name, file_path, sent_to_student, created_at ),
  invoices ( file_name, file_path, amount, due_date, sent_to_student, created_at ),
  payments ( code, amount, paid_date, file_name, file_path, status, note, created_at )`;

const emptyDb = (): DB => ({
  accounts: [],
  courses: [],
  applications: [],
  interests: {},
  tests: {},
  notifications: [],
});

const messageOf = (e: unknown) => (e instanceof Error ? e.message : typeof e === "string" ? e : "เกดข้อผิดพลาด");

function toCourse(r: any): Course {
  return {
    id: r.id,
    name: r.course_name,
    college: r.college_name,
    city: r.city,
    type: r.course_type,
    field: r.field,
    duration: r.duration,
    tuition: Number(r.tuition),
    level: r.language_level as Course["level"],
    intake: r.intake,
    description: r.description,
  };
}

function toApplication(r: any): Application {
  const offer = Array.isArray(r.offers) ? r.offers[0] : r.offers;
  const invoice = Array.isArray(r.invoices) ? r.invoices[0] : r.invoices;
  return {
    id: r.code,
    uuid: r.id,
    studentId: r.student_id,
    courseId: r.course_id,
    agentId: r.agent_id,
    collegeId: r.college_id ?? undefined,
    status: r.status as Status,
    submittedAt: r.submitted_at,
    docs: (r.application_documents ?? []).map((d: any) => ({
      key: d.doc_key,
      fileName: d.file_name,
      filePath: d.file_path,
      uploadedAt: d.uploaded_at,
    })),
    history: (r.application_history ?? [])
      .slice()
      .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((h: any) => ({ status: h.status, at: h.created_at, by: h.actor_label, note: h.note ?? undefined })),
    offer: offer
      ? { fileName: offer.file_name, filePath: offer.file_path, at: offer.created_at, sentToStudent: offer.sent_to_student }
      : undefined,
    invoice: invoice
      ? {
          fileName: invoice.file_name,
          filePath: invoice.file_path,
          amount: Number(invoice.amount),
          dueDate: invoice.due_date ?? "",
          at: invoice.created_at,
          sentToStudent: invoice.sent_to_student,
        }
      : undefined,
    payments: (r.payments ?? [])
      .slice()
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((p: any) => ({
        id: p.code,
        amount: Number(p.amount),
        paidDate: p.paid_date,
        fileName: p.file_name,
        filePath: p.file_path,
        status: p.status as PaymentStatus,
        note: p.note ?? undefined,
      })),
  };
}

type Ctx = {
  db: DB;
  me: Account | null;
  loading: boolean;
  busy: boolean;
  login: (email: string, password: string) => Promise<Account | null>;
  register: (a: { firstname: string; lastname: string; email: string; password: string }) => Promise<{
    ok: boolean;
    error?: string;
    needsConfirm?: boolean;
  }>;
  logout: () => Promise<void>;
  saveInterests: (i: Interests) => Promise<void>;
  saveTest: (t: {
    testType: string;
    score: string;
    level: string;
    testDate: string;
    expiryDate?: string | undefined;
    file?: File | null;
  }) => Promise<void>;
  myTest: () => LanguageTest | undefined;
  myInterests: () => Interests | undefined;
  canApply: (courseId: string) => boolean;
  createApplication: (courseId: string, docs: { key: string; fileName: string; filePath: string }[]) => Promise<Application | null>;
  uploadAppFile: (
    appId: string,
    bucket: "documents" | "offers" | "invoices" | "payments",
    name: string,
    file: File,
  ) => Promise<{ fileName: string; filePath: string }>;
  uploadDoc: (appId: string, doc: { key: string; file: File }) => Promise<void>;
  act: (appId: string, action: ApplicationAction, payload?: ActionPayload) => Promise<void>;
  markRead: (id?: string) => Promise<void>;
  unread: number;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDb);
  const [me, setMe] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const meRef = useRef<string | null>(null);
  const dbRef = useRef<DB>(db);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const refresh = useCallback(async () => {
    if (!meRef.current) return;
    const [accounts, apps, interests, tests, notes] = await Promise.all([
      supabase.from("profiles").select("id, firstname, lastname, email, org").order("lastname"),
      supabase.from("applications").select(APP_SELECT).order("submitted_at", { ascending: false }),
      supabase.from("study_interests").select("*"),
      supabase.from("language_tests").select("*"),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);

    const failure = [accounts, apps, interests, tests, notes].find((r) => r.error);
    if (failure?.error) {
      toast.error(failure.error.message);
      return;
    }

    setDb((prev) => ({
      ...prev,
      accounts: (accounts.data ?? []).map((p: any) => ({
        id: p.id,
        firstname: p.firstname,
        lastname: p.lastname,
        email: p.email,
        org: p.org ?? null,
      })),
      applications: (apps.data ?? []).map(toApplication),
      interests: Object.fromEntries(
        (interests.data ?? []).map((i: any) => [
          i.user_id,
          {
            city: i.city,
            type: i.course_type,
            field: i.field,
            duration: i.duration,
            budget: Number(i.budget),
            education: i.education,
            goal: i.goal,
          } satisfies Interests,
        ]),
      ),
      tests: Object.fromEntries(
        (tests.data ?? []).map((t: any) => [
          t.user_id,
          {
            testType: t.test_type,
            score: t.score,
            level: t.level,
            testDate: t.test_date,
            expiryDate: t.expiry_date ?? undefined,
            fileName: t.file_name,
            filePath: t.file_path,
          } satisfies LanguageTest,
        ]),
      ),
      notifications: (notes.data ?? []).map((n: any) => ({
        id: n.id,
        accountId: n.user_id,
        title: n.title,
        body: n.body,
        at: n.created_at,
        read: n.read,
      })),
    }));
  }, []);

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, course_name, college_name, city, course_type, field, duration, tuition, language_level, intake, description")
      .eq("is_active", true)
      .order("course_name");
    if (error) {
      toast.error(error.message);
      return;
    }
    setDb((prev) => ({ ...prev, courses: (data ?? []).map(toCourse) }));
  }, []);

  const accountRef = useRef<Account | null>(null);
  // Shared in-flight profile load so concurrent applyUser calls (login +
  // onAuthStateChange SIGNED_IN) resolve to the same account instead of the
  // second call returning a stale null and breaking the login flow.
  const profileInflightRef = useRef<Promise<Account | null> | null>(null);

  const applyUser = useCallback(
    async (user: { id: string } | null): Promise<Account | null> => {
      if (!user) {
        meRef.current = null;
        accountRef.current = null;
        setMe(null);
        setDb((prev) => ({ ...prev, accounts: [], applications: [], interests: {}, tests: {}, notifications: [] }));
        setLoading(false);
        return null;
      }
      if (profileInflightRef.current) return profileInflightRef.current;
      if (meRef.current === user.id && accountRef.current) return accountRef.current;
      let load!: Promise<Account | null>;
      load = (async (): Promise<Account | null> => {
        meRef.current = user.id;
        try {
          const acc = await ensureProfile();
          if (!acc.role) {
            await supabase.auth.signOut();
            meRef.current = null;
            accountRef.current = null;
            setMe(null);
            toast.error("This account has no role yet — please contact MapleLeaf Education");
            return null;
          }
          const account: Account = {
            id: acc.id,
            firstname: acc.firstname,
            lastname: acc.lastname,
            email: acc.email,
            org: acc.org,
            role: acc.role,
          };
          accountRef.current = account;
          setMe(account);
          await refresh();
          return account;
        } catch (e) {
          meRef.current = null;
          accountRef.current = null;
          setMe(null);
          toast.error(messageOf(e));
          return null;
        } finally {
          setLoading(false);
        }
      })();
      profileInflightRef.current = load;
      try {
        return await load;
      } finally {
        profileInflightRef.current = null;
      }
    },
    [refresh],
  );

  useEffect(() => {
    void loadCourses();
    let active = true;

    const timeout = setTimeout(() => setLoading(false), 10000);
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        void applyUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void applyUser(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (active) void applyUser(s.session?.user ?? null);
    });

    return () => {
      active = false;
      clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, [applyUser, loadCourses]);

  const guard = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      toast.error(messageOf(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const value: Ctx = useMemo(() => {
    const myTest = () => (me ? db.tests[me.id] : undefined);
    const myInterests = () => (me ? db.interests[me.id] : undefined);
    const appByCode = (appId: string) => dbRef.current.applications.find((a) => a.id === appId);

    return {
      db,
      me,
      loading,
      busy,
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data.user) {
          toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
          return null;
        }
        return applyUser(data.user);
      },
      register: async (a) => {
        const options = {
          data: { firstname: a.firstname, lastname: a.lastname },
          ...(typeof window === "undefined" ? {} : { emailRedirectTo: window.location.origin }),
        };
        const { data, error } = await supabase.auth.signUp({ email: a.email.trim(), password: a.password, options });
        if (error) return { ok: false, error: error.message };
        if (!data.session) {
          return { ok: true, needsConfirm: true };
        }
        await applyUser(data.user ?? null);
        return { ok: true };
      },
      logout: async () => {
        await supabase.auth.signOut();
        meRef.current = null;
        setMe(null);
        setDb((prev) => ({ ...prev, accounts: [], applications: [], interests: {}, tests: {}, notifications: [] }));
      },
      saveInterests: async (i) => {
        await guard(async () => {
          if (!me) return;
          const { error } = await supabase
            .from("study_interests")
            .upsert({
              user_id: me.id,
              city: i.city,
              course_type: i.type,
              field: i.field,
              duration: i.duration,
              budget: i.budget,
              education: i.education,
              goal: i.goal,
            });
          if (error) throw new Error(error.message);
          await refresh();
        });
      },
      saveTest: async (t) => {
        await guard(async () => {
          if (!me) return;
          let fileName = dbRef.current.tests[me.id]?.fileName ?? "";
          let filePath = dbRef.current.tests[me.id]?.filePath ?? "";
          if (t.file) {
            const path = `${me.id}/result.${extensionOf(t.file.name)}`;
            await uploadFile("results", path, t.file);
            fileName = t.file.name;
            filePath = path;
          }
          const { error } = await supabase.from("language_tests").upsert({
            user_id: me.id,
            test_type: t.testType,
            score: t.score,
            level: t.level,
            test_date: t.testDate,
            expiry_date: t.expiryDate || null,
            file_name: fileName,
            file_path: filePath,
          });
          if (error) throw new Error(error.message);
          await refresh();
        });
      },
      myTest,
      myInterests,
      canApply: (courseId) => {
        const course = db.courses.find((c) => c.id === courseId);
        return !!course && meetsLevel(myTest()?.level, course.level);
      },
      createApplication: async (courseId, docs) => {
        const result = await guard(async () => {
          const created = await submitApplication({ data: { courseId, docs } });
          await refresh();
          return created;
        });
        if (!result) return null;
        return dbRef.current.applications.find((a) => a.uuid === result.uuid) ?? null;
      },
      uploadAppFile: async (appId, bucket, name, file) => {
        const app = appByCode(appId);
        if (!app) throw new Error("ไมพบใบสมัครน้");
        const path = `${app.uuid}/${name}.${extensionOf(file.name)}`;
        await uploadFile(bucket, path, file);
        return { fileName: file.name, filePath: path };
      },
      uploadDoc: async (appId, doc) => {
        await guard(async () => {
          const app = appByCode(appId);
          if (!app) throw new Error("ไมพบบัใบสมัครน้");
          const path = `${app.uuid}/${doc.key}.${extensionOf(doc.file.name)}`;
          await uploadFile("documents", path, doc.file);
          const { error } = await supabase.from("application_documents").upsert(
            {
              application_id: app.uuid,
              doc_key: doc.key,
              file_name: doc.file.name,
              file_path: path,
              uploaded_by: me?.id ?? null,
            },
            { onConflict: "application_id,doc_key" },
          );
          if (error) throw new Error(error.message);
          await refresh();
        });
      },
      act: async (appId, action, payload) => {
        await guard(async () => {
          const app = appByCode(appId);
          if (!app) throw new Error("ไมพบบัใบสมัครน้");
          await runApplicationAction({ data: { appId: app.uuid, action, ...payload } });
          await refresh();
        });
      },
      markRead: async (id) => {
        await guard(async () => {
          let query = supabase.from("notifications").update({ read: true }).eq("user_id", me?.id ?? "");
          if (id) query = query.eq("id", id);
          const { error } = await query;
          if (error) throw new Error(error.message);
          await refresh();
        });
      },
      unread: db.notifications.filter((n) => n.accountId === me?.id && !n.read).length,
    };
  }, [db, me, loading, busy, applyUser, guard, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function missingDocs(docs: Doc[]) {
  return DOC_TYPES.filter((d) => d.required && !docs.some((x) => x.key === d.key)).map((d) => d.label);
}

export { STATUSES };
