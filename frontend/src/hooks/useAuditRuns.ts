import { useSyncExternalStore } from "react";
import { auditRunStore } from "@/services/auditRuns";

export function useAuditRuns() {
  return useSyncExternalStore(
    auditRunStore.subscribe,
    () => auditRunStore.getState().runs,
    () => auditRunStore.getState().runs,
  );
}

export function useAuditRun(id: string) {
  return useSyncExternalStore(
    auditRunStore.subscribe,
    () => auditRunStore.getState().runs.find((r) => r.id === id),
    () => auditRunStore.getState().runs.find((r) => r.id === id),
  );
}
