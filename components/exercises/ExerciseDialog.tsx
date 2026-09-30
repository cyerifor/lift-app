"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function ExerciseDialog({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null; const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",key);ref.current?.focus();return()=>{document.removeEventListener("keydown",key);previous?.focus();};},[onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl outline-none sm:rounded-3xl sm:p-7">{children}</div></div>;
}
