import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { services } from "@/services";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const user = services.auth.currentUser();
    navigate({ to: user ? "/app/dashboard" : "/login", replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
      در حال هدایت…
    </div>
  );
}
