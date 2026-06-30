"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link2,
  Type,
  Smile,
  Paperclip,
  SendHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmojiPopover } from "./emoji-picker";

export function Composer({
  onSend,
  placeholder = "Type a message",
  replyTo,
  onCancelReply,
}: {
  onSend: (content: string, attachments: string[]) => Promise<void> | void;
  placeholder?: string;
  replyTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }

  function surround(before: string, after = before) {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "text";
    setDraft(value.slice(0, s) + before + sel + after + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
      autoGrow();
    });
  }

  function linePrefix(kind: "bullet" | "number" | "quote") {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const startLine = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(startLine, e);
    const prefixed = block
      .split("\n")
      .map((l, i) =>
        kind === "number" ? `${i + 1}. ${l}` : kind === "quote" ? `> ${l}` : `- ${l}`
      )
      .join("\n");
    setDraft(value.slice(0, startLine) + prefixed + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      autoGrow();
    });
  }

  function insertText(text: string) {
    const ta = taRef.current;
    if (!ta) {
      setDraft((d) => d + text);
      return;
    }
    const { selectionStart: s, selectionEnd: e, value } = ta;
    setDraft(value.slice(0, s) + text + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + text.length, s + text.length);
      autoGrow();
    });
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setAttachments((a) => [...a, url]);
      }
    }
    setUploading(false);
  }

  async function submit() {
    const content = draft.trim();
    if (!content && attachments.length === 0) return;
    setSending(true);
    try {
      await onSend(content, attachments);
      setDraft("");
      setAttachments([]);
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.style.height = "auto";
      });
    } finally {
      setSending(false);
    }
  }

  const canSend = !!draft.trim() || attachments.length > 0;

  const toolbar = [
    { icon: Bold, label: "Bold", fn: () => surround("**") },
    { icon: Italic, label: "Italic", fn: () => surround("*") },
    { icon: Strikethrough, label: "Strikethrough", fn: () => surround("~~") },
    { icon: Code, label: "Code", fn: () => surround("`") },
    { icon: List, label: "Bulleted list", fn: () => linePrefix("bullet") },
    { icon: ListOrdered, label: "Numbered list", fn: () => linePrefix("number") },
    { icon: Quote, label: "Quote", fn: () => linePrefix("quote") },
    { icon: Link2, label: "Link", fn: () => surround("[", "](url)") },
  ];

  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded text-faint transition-colors hover:bg-surface hover:text-text";

  return (
    <div className="rounded-md border border-border bg-elevated transition-colors focus-within:border-accent">
      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-start gap-2 border-b border-border px-3 py-1.5">
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-2">
            <p className="text-[11px] font-semibold text-accent">
              Replying to {replyTo.senderName}
            </p>
            <p className="truncate text-[12px] text-muted">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-faint hover:text-text"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Format toolbar (toggle) */}
      {formatOpen && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
          {toolbar.map((t) => (
            <button key={t.label} type="button" title={t.label} onClick={t.fn} className={iconBtn}>
              <t.icon size={15} />
            </button>
          ))}
        </div>
      )}

      {/* Attachment previews */}
      {(attachments.length > 0 || uploading) && (
        <div className="flex flex-wrap gap-2 px-2.5 pt-2">
          {attachments.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="attachment"
                className="h-16 w-16 rounded border border-border object-cover"
              />
              <button
                onClick={() => setAttachments((a) => a.filter((u) => u !== url))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-overlay text-faint shadow-sm hover:text-danger"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border">
              <Spinner size={16} />
            </div>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1 px-2 py-1.5">
        <textarea
          ref={taRef}
          value={draft}
          rows={1}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="block max-h-[180px] min-h-[28px] flex-1 resize-none self-center bg-transparent px-1.5 py-1 text-[13px] leading-relaxed outline-none placeholder:text-faint"
        />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="Format"
            onClick={() => setFormatOpen((o) => !o)}
            className={cn(iconBtn, formatOpen && "bg-surface text-text")}
          >
            <Type size={16} />
          </button>
          <EmojiPopover onPick={insertText} align="right">
            <span className={iconBtn}>
              <Smile size={17} />
            </span>
          </EmojiPopover>
          <button
            type="button"
            title="Attach image"
            onClick={() => fileRef.current?.click()}
            className={iconBtn}
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFiles}
          />
          <button
            type="button"
            onClick={submit}
            disabled={sending || !canSend}
            title="Send"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              canSend
                ? "text-accent hover:bg-accent-soft"
                : "text-faint disabled:cursor-default"
            )}
          >
            {sending ? <Spinner size={15} /> : <SendHorizontal size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}
