"use client";

// Draws an unread badge (red circle + count) over the app logo and swaps the
// favicon. Pass 0 to restore the plain logo.

const BASE = "/favicon/favicon-32x32.png";
let baseImg: HTMLImageElement | null = null;

function iconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

function render(count: number) {
  const link = iconLink();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (baseImg && baseImg.complete && baseImg.naturalWidth) {
    ctx.drawImage(baseImg, 0, 0, size, size);
  } else {
    // Fallback base: rounded blue square so the badge still has context.
    ctx.fillStyle = "#4f9dff";
    ctx.beginPath();
    ctx.roundRect(2, 2, size - 4, size - 4, 12);
    ctx.fill();
  }

  // Badge
  const r = 21;
  const cx = size - r - 1;
  const cy = r + 1;
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${count > 9 ? 26 : 32}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(count > 9 ? "9+" : String(count), cx, cy + 1);

  link.href = canvas.toDataURL("image/png");
}

export function setFaviconBadge(count: number) {
  if (typeof document === "undefined") return;
  if (count <= 0) {
    iconLink().href = BASE;
    return;
  }
  if (!baseImg) {
    baseImg = new Image();
    baseImg.src = BASE;
    baseImg.onload = () => render(count);
  }
  if (baseImg.complete) render(count);
}
