// Tiny, safe markdown -> HTML for chat messages.
// Everything is HTML-escaped first; we only ever inject a fixed set of tags
// with controlled attributes, so the output is safe for dangerouslySetInnerHTML.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMarkdown(input: string): string {
  // Split out inline code spans so their contents aren't reformatted.
  const parts = input.split(/(`[^`]+`)/g);

  return parts
    .map((part) => {
      if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
        return `<code class="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10">${escapeHtml(
          part.slice(1, -1)
        )}</code>`;
      }

      let s = escapeHtml(part);

      // [label](url)
      s = s.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, label, url) =>
          `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${label}</a>`
      );
      // **bold**
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      // ~~strike~~
      s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
      // *italic* / _italic_
      s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
      s = s.replace(/(^|[\s(])_([^_\s][^_]*)_/g, "$1<em>$2</em>");
      // bare URLs
      s = s.replace(
        /(^|\s)(https?:\/\/[^\s<]+)/g,
        (_m, pre, url) =>
          `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${url}</a>`
      );
      // newlines
      s = s.replace(/\n/g, "<br/>");
      return s;
    })
    .join("");
}
