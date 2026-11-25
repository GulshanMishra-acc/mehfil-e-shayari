// =====================================================================
// js/profile.js  -  logic for the author profile page (pages/profile.html)
//
// The page address looks like:  profile.html?author=Aman
// We read the name after "author=", find every public poem written by
// that author, and show them. Nothing here needs to be edited when you
// add poems - authors are read from js/poems.js automatically.
// =====================================================================

import {
  loadPublicPoems,
  sortPoems,
  getAuthors,
  poemsByAuthor,
  poemCardHtml,
  profileUrl,
  escapeHtml,
} from "./utils.js";

// ---- Elements from profile.html ---------------------------------------
const profileInitial = document.getElementById("profileInitial");
const profileName = document.getElementById("profileName");
const profileCount = document.getElementById("profileCount");
const profileControls = document.getElementById("profileControls");
const profileSort = document.getElementById("profileSort");
const poemGrid = document.getElementById("poemGrid");
const profileMessage = document.getElementById("profileMessage");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const otherAuthorsSection = document.getElementById("otherAuthors");
const otherAuthorsList = document.getElementById("otherAuthorsList");

let authorPoems = [];

// ---- Show a friendly message (no author, unknown author, error) ----------
function showMessage(title, text) {
  profileName.textContent = "Shayar not found";
  profileInitial.textContent = "?";
  profileCount.textContent = "";
  profileControls.hidden = true;
  poemGrid.innerHTML = "";
  messageTitle.textContent = title;
  messageText.textContent = text;
  profileMessage.hidden = false;
}

// ---- Draw this author's poems ---------------------------------------------
function renderPoems() {
  const sorted = sortPoems(authorPoems, profileSort.value);
  poemGrid.innerHTML = sorted
    .map((poem) => poemCardHtml(poem, { authorLinkBase: "" }))
    .join("");
}

// ---- Links to the other authors ---------------------------------------------
function renderOtherAuthors(allAuthors, currentName) {
  const others = allAuthors.filter(
    (author) => author.name.toLocaleLowerCase() !== currentName.toLocaleLowerCase()
  );

  if (others.length === 0) {
    otherAuthorsSection.hidden = true;
    return;
  }

  otherAuthorsList.innerHTML = others
    .map(
      (author) => `
      <a class="chip" href="${escapeHtml(profileUrl(author.name))}">
        ${escapeHtml(author.name)}
        <span class="chip-count">${author.count}</span>
      </a>`
    )
    .join("");
  otherAuthorsSection.hidden = false;
}

// ---- Start ------------------------------------------------------------------
async function init() {
  const params = new URLSearchParams(window.location.search);
  const requestedAuthor = (params.get("author") || "").trim();

  const { poems, error } = await loadPublicPoems();

  if (error) {
    showMessage(
      "We couldn't load the shayari",
      "Something is wrong in js/poems.js (often a missing comma or backtick). Press F12 and open the Console tab to see the exact line."
    );
    return;
  }

  const allAuthors = getAuthors(poems);

  if (!requestedAuthor) {
    showMessage(
      "No shayar chosen",
      "Pick a shayar from the list below, or go back to the homepage and click an author's name."
    );
    renderOtherAuthors(allAuthors, "");
    return;
  }

  authorPoems = poemsByAuthor(poems, requestedAuthor);

  if (authorPoems.length === 0) {
    showMessage(
      "We couldn't find that shayar",
      `There is no public shayari by "${requestedAuthor}". Maybe the name is spelled differently?`
    );
    renderOtherAuthors(allAuthors, "");
    return;
  }

  // The name exactly as written in poems.js (e.g. "Aman")
  const displayName = authorPoems[0].author;

  document.title = `${displayName} - Mehfil-e-Shayari`;
  profileName.textContent = displayName;
  profileInitial.textContent = Array.from(displayName)[0].toLocaleUpperCase();
  profileCount.textContent = `${authorPoems.length} shayari`;
  profileControls.hidden = false;

  renderPoems();
  renderOtherAuthors(allAuthors, displayName);
}

profileSort.addEventListener("change", renderPoems);

init();
