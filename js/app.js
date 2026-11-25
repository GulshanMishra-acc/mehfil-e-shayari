// =====================================================================
// js/app.js  -  logic for the homepage (index.html)
//
// What it does:
//   1. loads the public poems from js/poems.js
//   2. shows them as cards
//   3. filters them when you search (poem text OR author name)
//   4. sorts them (newest first / oldest first)
//   5. shows the list of authors with links to their profile pages
// =====================================================================

import {
  loadPublicPoems,
  sortPoems,
  getAuthors,
  poemCardHtml,
  profileUrl,
  escapeHtml,
} from "./utils.js";

// ---- Elements from index.html ---------------------------------------
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resultCount = document.getElementById("resultCount");
const poemGrid = document.getElementById("poemGrid");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const clearSearchButton = document.getElementById("clearSearchButton");
const authorsSection = document.getElementById("shayars");
const authorList = document.getElementById("authorList");

// All cleaned poems (filled in by init)
let allPoems = [];

// ---- Search ---------------------------------------------------------
function matchesSearch(poem, query) {
  if (!query) return true;
  return (
    poem.text.toLocaleLowerCase().includes(query) ||
    poem.author.toLocaleLowerCase().includes(query)
  );
}

// ---- Show / hide the "nothing to show" message ------------------------
function showEmptyState(title, text, showClearButton) {
  emptyTitle.textContent = title;
  emptyText.textContent = text;
  clearSearchButton.hidden = !showClearButton;
  emptyState.hidden = false;
}

// ---- Draw the poem cards ------------------------------------------------
function render() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const matching = allPoems.filter((poem) => matchesSearch(poem, query));
  const visible = sortPoems(matching, sortSelect.value);

  poemGrid.innerHTML = visible
    .map((poem) => poemCardHtml(poem, { authorLinkBase: "pages/" }))
    .join("");

  if (allPoems.length === 0) {
    resultCount.textContent = "";
    showEmptyState(
      "No shayari yet",
      "Add your first shayari in js/poems.js and it will appear here.",
      false
    );
    return;
  }

  if (visible.length === 0) {
    resultCount.textContent = "No matches";
    showEmptyState(
      "No shayari found",
      `Nothing matched "${searchInput.value.trim()}". Try another word or a friend's name.`,
      true
    );
    return;
  }

  emptyState.hidden = true;
  resultCount.textContent = `Showing ${visible.length} of ${allPoems.length} shayari`;
}

// ---- Author chips ---------------------------------------------------------
function renderAuthors() {
  const authors = getAuthors(allPoems);

  if (authors.length === 0) {
    authorsSection.hidden = true;
    return;
  }

  authorList.innerHTML = authors
    .map(
      (author) => `
      <a class="chip" href="${escapeHtml(profileUrl(author.name, "pages/"))}">
        ${escapeHtml(author.name)}
        <span class="chip-count">${author.count}</span>
      </a>`
    )
    .join("");
  authorsSection.hidden = false;
}

// ---- Start ------------------------------------------------------------------
async function init() {
  const { poems, error } = await loadPublicPoems();

  if (error) {
    resultCount.textContent = "";
    showEmptyState(
      "We couldn't load the shayari",
      "Something is wrong in js/poems.js (often a missing comma or backtick). Press F12 and open the Console tab to see the exact line.",
      false
    );
    authorsSection.hidden = true;
    return;
  }

  allPoems = poems;
  renderAuthors();
  render();
}

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  render();
  searchInput.focus();
});

init();
