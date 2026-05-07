"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "none"
      }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success": return <CheckCircle2 size={18} color="#36b37e" />;
      case "error": return <AlertCircle size={18} color="#ff5630" />;
      default: return <Info size={18} color="#0065ff" />;
    }
  };

  return (
    <div style={{
      minWidth: "300px",
      maxWidth: "400px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "var(--shadow-xl)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      pointerEvents: "auto",
      animation: isExiting ? "toast-out 0.3s forwards" : "toast-in 0.3s ease-out",
      backdropFilter: "blur(8px)"
    }}>
      {getIcon()}
      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>
        {toast.message}
      </span>
      <button onClick={handleRemove} style={{
        background: "transparent",
        border: "none",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px",
        borderRadius: "4px"
      }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
         onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        <X size={14} />
      </button>
      
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(40px); }
        }
      `}</style>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
