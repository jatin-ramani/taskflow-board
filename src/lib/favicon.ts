"use client";

// Draws an unread badge (red circle + count) over the app icon and swaps every
// <link rel="icon"> so the badge shows regardless of which one the browser uses.

const BASE = "/favicon/favicon-32x32.png";
let baseImg: HTMLImageElement | null = null;

function iconLinks(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
}

function ensureImg(cb: () => void) {
  if (baseImg && baseImg.complete && baseImg.naturalWidth) return cb();
  if (!baseImg) {
    baseImg = new Image();
    baseImg.onload = cb;
    baseImg.onerror = cb;
    baseImg.src = BASE;
  } else {
    baseImg.onload = cb;
  }
}

function badgeDataUrl(count: number): string | null {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (baseImg && baseImg.complete && baseImg.naturalWidth) {
    ctx.drawImage(baseImg, 0, 0, size, size);
  } else {
    ctx.fillStyle = "#4f9dff";
    ctx.beginPath();
    ctx.roundRect(2, 2, size - 4, size - 4, 12);
    ctx.fill();
  }

  const r = 22;
  const cx = size - r;
  const cy = r;
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${count > 9 ? 28 : 34}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(count > 9 ? "9+" : String(count), cx, cy + 1);
  return canvas.toDataURL("image/png");
}

export function setFaviconBadge(count: number) {
  if (typeof document === "undefined") return;
  let links = iconLinks();
  if (!links.length) {
    const l = document.createElement("link");
    l.rel = "icon";
    l.href = BASE;
    document.head.appendChild(l);
    links = iconLinks();
  }

  if (count <= 0) {
    links.forEach((l) => {
      if (l.dataset.orig) {
        l.href = l.dataset.orig;
        delete l.dataset.orig;
      }
    });
    return;
  }

  ensureImg(() => {
    const url = badgeDataUrl(count);
    if (!url) return;
    iconLinks().forEach((l) => {
      if (!l.dataset.orig) l.dataset.orig = l.href;
      l.href = url;
    });
  });
}
