import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/guard";

export const Route = createFileRoute("/admin")({
  component: () => (
    <RoleGuard role="admin">
      <Outlet />
    </RoleGuard>
  ),
});
