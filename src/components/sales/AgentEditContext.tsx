"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
const Context = createContext<{ dirty: boolean; setDirty: (dirty: boolean) => void }>({
  dirty: false,
  setDirty: () => {},
});
export function useAgentEdits() { return useContext(Context); }
export default function AgentEditProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <Context.Provider value={{ dirty, setDirty }}>{children}</Context.Provider>;
}
