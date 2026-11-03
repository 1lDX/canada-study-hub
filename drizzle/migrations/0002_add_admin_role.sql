-- Add the minimal 'admin' role to the role enum. No new RLS policies: admin
-- intentionally has no access to application contents (applications, documents,
-- offers, invoices, payments) and gets nothing beyond what it already had.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';