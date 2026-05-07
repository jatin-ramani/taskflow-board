"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { Calendar } from "./calendar"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date;
  onSelect: (date?: Date) => void;
  placeholder?: string;
  label?: string;
  clearable?: boolean;
}

export function DatePicker({ date, onSelect, placeholder = "Pick a date", label, clearable = true }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary)" }}>{label}</label>}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              height: "38px",
              padding: "0 14px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: date ? "#f1f1f1" : "#6b7280",
              fontSize: "13px",
              fontWeight: 500,
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              outline: "none",
            }}
          >
            <CalendarIcon size={16} style={{ opacity: 0.6 }} />
            <span style={{ flex: 1 }}>{date ? format(date, "PPP") : placeholder}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={5}
            align="start"
            style={{
              background: "#1e1f21",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              zIndex: 10000,
              overflow: "hidden",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                onSelect(d);
                setOpen(false);
              }}
              initialFocus
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
