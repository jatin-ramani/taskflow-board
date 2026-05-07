"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "12px", zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} className="animate-slide-in-right" style={{ 
            minWidth: "300px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 16px", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", gap: "12px" 
          }}>
            {t.type === "success" && <CheckCircle2 size={18} color="var(--success)" />}
            {t.type === "error" && <AlertCircle size={18} color="var(--danger)" />}
            {t.type === "info" && <Info size={18} color="var(--accent)" />}
            <span style={{ fontSize: "14px", color: "var(--text-primary)", flex: 1 }}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
