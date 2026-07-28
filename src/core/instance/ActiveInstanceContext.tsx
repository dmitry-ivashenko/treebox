import { createContext, useContext } from "react";
import type { TreeboxInstance } from "./types";

const ActiveInstanceCtx = createContext<TreeboxInstance | null>(null);

export function ActiveInstanceProvider({ instance, children }: { instance: TreeboxInstance; children: React.ReactNode }) {
  return <ActiveInstanceCtx.Provider value={instance}>{children}</ActiveInstanceCtx.Provider>;
}

export function useActiveInstance(): TreeboxInstance {
  const ctx = useContext(ActiveInstanceCtx);
  if (!ctx) throw new Error("useActiveInstance must be used within ActiveInstanceProvider");
  return ctx;
}

export function useActiveInstanceOrNull(): TreeboxInstance | null {
  return useContext(ActiveInstanceCtx);
}
