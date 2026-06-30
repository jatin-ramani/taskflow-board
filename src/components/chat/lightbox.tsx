"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, images.length, onIndex, onClose]);

  const url = images[index];
  if (!url) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-3">
        <span className="text-[13px] text-white/70">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index - 1);
          }}
          className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] rounded object-contain"
      />

      {index < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index + 1);
          }}
          className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
