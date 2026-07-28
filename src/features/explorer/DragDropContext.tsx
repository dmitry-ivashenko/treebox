import { createContext, useContext } from "react";
import { useDragDrop } from "./useDragDrop";

type DragDropContextType = ReturnType<typeof useDragDrop>;

const DragDropCtx = createContext<DragDropContextType | null>(null);

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const dnd = useDragDrop();
  return <DragDropCtx.Provider value={dnd}>{children}</DragDropCtx.Provider>;
}

export function useDragDropContext(): DragDropContextType {
  const ctx = useContext(DragDropCtx);
  if (!ctx) throw new Error("useDragDropContext must be inside DragDropProvider");
  return ctx;
}
