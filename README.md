# MapleLeaf Education

ระบบจัดการการสมัครเรียนต่อต่างประเทศสำหรับ MapleLeaf Education ช่วยให้ Student ค้นหาหลักสูตร สมัครเรียน อัปโหลดเอกสาร และติดตามสถานะได้ ส่วน Agent และ College ใช้จัดการขั้นตอนการสมัครร่วมกัน

โปรเจกต์นี้เชื่อมต่อกับ Supabase ของทีมโดยตรง ฐานข้อมูลจึงเป็น PostgreSQL บน Supabase ส่วนตัวแอปสามารถรันบนเครื่องได้ผ่าน Vite

## เทคโนโลยี

- React 19 + TypeScript
- Vite + TanStack Start + TanStack Router
- Tailwind CSS และ Radix UI
- Supabase Auth, PostgreSQL, Storage และ Row Level Security
- Drizzle ORM/Kit สำหรับโค้ดและ migration ที่เกี่ยวข้อง

## บทบาทผู้ใช้

- **Student** — ค้นหาหลักสูตร ส่งใบสมัคร อัปโหลดเอกสาร และติดตามผล
- **Agent** — ดูแลใบสมัครของนักเรียนและอัปเดต workflow
- **College** — จัดการหลักสูตรและดำเนินการในส่วนของสถาบัน
- **Admin** — จัดการบัญชีผู้ใช้เท่านั้น ไม่ได้มีสิทธิ์อ่านหรือเขียนข้อมูลใบสมัคร เอกสาร ข้อเสนอ ใบแจ้งหนี้ หรือการชำระเงิน

## เริ่มรันบนเครื่อง

ต้องใช้ Node.js และ npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

จากนั้นเปิด `http://localhost:5173`

ก่อนรัน ให้แก้ค่าใน `.env.local` ให้เป็นค่าจาก Supabase project ของทีม โดยเฉพาะ `SUPABASE_SERVICE_ROLE_KEY` ซึ่งเป็นคีย์ฝั่ง server เท่านั้น ห้ามใส่ prefix `VITE_` และห้าม commit ค่าจริงขึ้น Git

คำสั่งที่ใช้บ่อย:

```bash
npm run build   # ตรวจสอบ production build
npm run lint    # ตรวจสอบโค้ด
npm run preview # เปิดดู production build หลัง build เสร็จ
```

## Environment variables

ดูชื่อและรูปแบบค่าที่ต้องใช้ได้จาก `.env.example`

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — ใช้ฝั่ง browser
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — ใช้ใน SSR/server เมื่อจำเป็น
- `SUPABASE_SERVICE_ROLE_KEY` — server-only สำหรับ server functions ที่ต้องทำงานแทนระบบ; ห้ามเปิดเผยต่อผู้ใช้และห้ามส่งขึ้น repository

โปรเจกต์ที่ใช้งานอยู่: [Supabase dashboard](https://supabase.com/dashboard/project/ghcwlreulopzvvmcoojx)

## โครงสร้างฐานข้อมูล

Schema หลักอยู่ใน `supabase/migrations/` และใช้ชื่อ table เดิมของระบบ เช่น:

- `profiles`, `user_roles`, `agents`, `colleges`
- `courses`, `study_interests`, `language_tests`
- `applications`, `application_documents`, `application_history`
- `offers`, `invoices`, `payments`, `notifications`

ตารางระบบของ Supabase เช่น `auth.users` ใช้สำหรับบัญชีและอีเมล ส่วนข้อมูลโปรไฟล์/บทบาทอยู่ใน `public.profiles` และ `public.user_roles`

ตัวอย่าง query สำหรับตรวจสอบผู้ใช้ใน Supabase SQL Editor:

```sql
select
  u.id,
  u.email,
  p.firstname,
  p.lastname,
  coalesce(string_agg(ur.role::text, ', ' order by ur.role), '') as roles
from auth.users u
left join public.profiles p on p.id = u.id
left join public.user_roles ur on ur.user_id = u.id
group by u.id, u.email, p.firstname, p.lastname
order by u.created_at desc;
```

## Backup และการย้ายฐานข้อมูล

สคริปต์ `scripts/import-supabase-backup.sh` ใช้ restore PostgreSQL custom backup เข้า Supabase project ใหม่ โดยจะนำเข้า schema/data, Auth users, bucket definitions และ policy ที่จำเป็น

```bash
./scripts/import-supabase-backup.sh /path/to/postgresql.custom.backup
```

สคริปต์จะถาม database password ตอนรัน และไม่เก็บรหัสผ่านไว้ในไฟล์ ไฟล์จริงใน Supabase Storage ไม่ได้อยู่ใน PostgreSQL dump จึงต้องย้ายแยกหากมีไฟล์ที่ต้องใช้

## บัญชีทดลอง

หน้า Login มีปุ่มบัญชีทดลองสำหรับทดสอบ workflow:

- `student@demo.com`
- `agent@demo.com`
- `college@demo.com`
- `admin@demo.com`

รหัสผ่านของบัญชีทดลองคือ `MapleDemo#2026`

## หมายเหตุสำหรับการพัฒนา

- ห้ามแก้หรือ commit คีย์ลับใน `.env.local`
- ควรรักษา Row Level Security และสิทธิ์ของ `admin` ตาม migration ที่มีอยู่
- หากแก้ schema ให้สร้าง migration ใหม่ใน `supabase/migrations/` แทนการแก้ migration ที่เคยใช้งานแล้ว
