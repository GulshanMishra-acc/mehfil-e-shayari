// =====================================================================
// js/utils.js  -  small helpers shared by app.js, profile.js, private.js
//
// You normally never need to edit this file. It exists so the same
// code is written only once (no copy-pasted duplicates).
// =====================================================================

// ---------------------------------------------------------------------
// Safety: turn special characters into harmless text before putting
// anything inside HTML. Every poem, author name and search word that is
// inserted with innerHTML goes through this first.
// ---------------------------------------------------------------------
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ---------------------------------------------------------------------
// Dates. Poems store dates as "YYYY-MM-DD".
// parseDate returns a Date, or null when the date is missing/invalid
// (for example "2026-02-31" or "yesterday").
// ---------------------------------------------------------------------
export function parseDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
}

// Shows "28 Oct 2026", or "Date unknown" for a bad date.
export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "Date unknown";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------------------------------------------------------------------
// Clean a list of poems so the rest of the code can trust it.
//  - ignores anything that is not a proper poem
//  - missing author  ->  "Unknown"
//  - invalid date    ->  "" (shown as "Date unknown")
//  - trims spaces at the start/end of every line (keeps line breaks)
//  - warns in the browser console about duplicate ids
// ---------------------------------------------------------------------
export function normalizePoems(rawList) {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set();
  const cleaned = [];

  rawList.forEach((item, index) => {
    if (!item || typeof item !== "object") return;

    const rawText = typeof item.text === "string" ? item.text : "";
    const text = rawText
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();

    if (!text) {
      console.warn(`Poem number ${index + 1} has no text and was skipped.`);
      return;
    }

    const id = item.id ?? `poem-${index + 1}`;
    if (seenIds.has(id)) {
      console.warn(`Duplicate poem id "${id}". Every poem needs its own id.`);
    }
    seenIds.add(id);

    const author =
      typeof item.author === "string" && item.author.trim()
        ? item.author.trim()
        : "Unknown";

    const date =
      typeof item.date === "string" && parseDate(item.date)
        ? item.date.trim()
        : "";

    cleaned.push({ id, author, text, date });
  });

  return cleaned;
}

// ---------------------------------------------------------------------
// Load js/poems.js. If you made a typing mistake in that file (a missing
// comma or backtick), we show a friendly message instead of a blank page.
// ---------------------------------------------------------------------
export async function loadPublicPoems() {
  try {
    const poemsModule = await import("./poems.js");
    return { poems: normalizePoems(poemsModule.poems), error: null };
  } catch (error) {
    console.error("Could not load js/poems.js:", error);
    return { poems: [], error };
  }
}

// ---------------------------------------------------------------------
// Sorting. order is "newest" or "oldest".
// Poems without a valid date always go to the end.
// ---------------------------------------------------------------------
function compareIds(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function sortPoems(poemList, order = "newest") {
  const direction = order === "oldest" ? 1 : -1;

  return [...poemList].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);

    if (!dateA && !dateB) return compareIds(a.id, b.id);
    if (!dateA) return 1;
    if (!dateB) return -1;

    const difference = dateA.getTime() - dateB.getTime();
    if (difference !== 0) return difference * direction;

    // Same date: use the id so the order is always predictable.
    return compareIds(a.id, b.id) * direction;
  });
}

// ---------------------------------------------------------------------
// Authors are read from the poems themselves. "Aman" and "aman " are
// treated as the same person.
// ---------------------------------------------------------------------
function authorKey(name) {
  return String(name ?? "").trim().toLocaleLowerCase();
}

// Returns [{ name: "Aman", count: 2 }, ...] sorted by name.
export function getAuthors(poemList) {
  const authors = new Map();

  for (const poem of poemList) {
    const key = authorKey(poem.author);
    const existing = authors.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      authors.set(key, { name: poem.author, count: 1 });
    }
  }

  return [...authors.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function poemsByAuthor(poemList, name) {
  const key = authorKey(name);
  return poemList.filter((poem) => authorKey(poem.author) === key);
}

// Link to an author's profile.
// basePath is "pages/" when used from index.html and "" from pages/*.html
export function profileUrl(authorName, basePath = "") {
  return `${basePath}profile.html?author=${encodeURIComponent(authorName)}`;
}

// ---------------------------------------------------------------------
// One poem card (HTML text). Everything user-controlled is escaped.
// Pass authorLinkBase to make the author's name a link, or leave it out
// for a plain name (used on the private page).
// ---------------------------------------------------------------------
export function poemCardHtml(poem, { authorLinkBase = null } = {}) {
  const authorName = escapeHtml(poem.author);

  const authorHtml =
    authorLinkBase === null
      ? `<span class="poem-author">${authorName}</span>`
      : `<a class="poem-author" href="${escapeHtml(
          profileUrl(poem.author, authorLinkBase)
        )}">${authorName}</a>`;

  const hasValidDate = parseDate(poem.date) !== null;
  const dateAttribute = hasValidDate
    ? ` datetime="${escapeHtml(poem.date)}"`
    : "";

  return `
    <article class="poem-card">
      <p class="poem-text" dir="auto">${escapeHtml(poem.text)}</p>
      <footer class="poem-meta">
        ${authorHtml}
        <time${dateAttribute}>${escapeHtml(formatDate(poem.date))}</time>
      </footer>
    </article>`;
}
