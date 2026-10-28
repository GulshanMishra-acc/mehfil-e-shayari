// =====================================================================
// js/private.js  -  logic for the private collection (pages/private.html)
//
// HOW THE SECURITY WORKS (important):
//   - This file contains NO private poems and NO PIN.
//   - When you press "Unlock", the PIN you typed is sent over HTTPS to
//     the Supabase Edge Function "verify-private-pin".
//   - The SERVER compares it with the secret PIN. Only if it is correct
//     does the server send the private poems back.
//   - The poems exist on this page only while it is unlocked. "Lock"
//     removes them from the page. Nothing is saved in localStorage or
//     sessionStorage, and the typed PIN is cleared after every attempt.
// =====================================================================

import {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  PRIVATE_FUNCTION_NAME,
  isSupabaseConfigured,
} from "./config.js";
import { normalizePoems, poemCardHtml } from "./utils.js";

// ---- Settings ---------------------------------------------------------------
const REQUEST_TIMEOUT_MS = 15000; // give up waiting after 15 seconds
const AUTO_LOCK_MINUTES = 10; // lock again automatically after 10 minutes

// ---- Elements from private.html -----------------------------------------------
const lockedPanel = document.getElementById("lockedPanel");
const unlockedPanel = document.getElementById("unlockedPanel");
const unlockForm = document.getElementById("unlockForm");
const pinInput = document.getElementById("pinInput");
const showPinCheckbox = document.getElementById("showPin");
const unlockButton = document.getElementById("unlockButton");
const statusMessage = document.getElementById("statusMessage");
const unlockedMessage = document.getElementById("unlockedMessage");
const lockButton = document.getElementById("lockButton");
const privateGrid = document.getElementById("privateGrid");

let autoLockTimer = null;

// ---- Small helpers --------------------------------------------------------------
function setStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status status-${type}`;
}

function setBusy(isBusy) {
  unlockButton.disabled = isBusy;
  pinInput.disabled = isBusy;
  unlockButton.textContent = isBusy ? "Checking..." : "Unlock";
}

function functionUrl() {
  const baseUrl = String(SUPABASE_URL).trim().replace(/\/+$/, "");
  return `${baseUrl}/functions/v1/${PRIVATE_FUNCTION_NAME}`;
}

function waitText(seconds) {
  const minutes = Math.max(1, Math.ceil(Number(seconds) / 60));
  return minutes === 1 ? "about a minute" : `about ${minutes} minutes`;
}

// ---- Ask the server ---------------------------------------------------------------
async function requestPrivatePoems(pin) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(functionUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY, // public key, safe to send
      },
      body: JSON.stringify({ pin }),
      signal: controller.signal,
      cache: "no-store",
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null; // the server did not answer with JSON
    }
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Lock / unlock --------------------------------------------------------------------
function lock(message) {
  clearTimeout(autoLockTimer);
  privateGrid.innerHTML = ""; // remove every private poem from the page
  pinInput.value = "";
  showPinCheckbox.checked = false;
  pinInput.type = "password";
  unlockedPanel.hidden = true;
  lockedPanel.hidden = false;
  setStatus(
    message || "Locked. The private shayari were removed from this page.",
    "info"
  );
}

function showPoems(poems) {
  privateGrid.innerHTML = poems
    .map((poem) => poemCardHtml(poem)) // no author links: profiles are public
    .join("");

  unlockedMessage.textContent =
    poems.length === 0
      ? "Unlocked, but no private shayari have been added yet."
      : `Welcome in. ${poems.length} private shayari unlocked.`;

  lockedPanel.hidden = true;
  unlockedPanel.hidden = false;
  setStatus("", "info");

  clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(
    () => lock(`Locked automatically after ${AUTO_LOCK_MINUTES} minutes.`),
    AUTO_LOCK_MINUTES * 60 * 1000
  );

  lockButton.focus();
}

// ---- Understand the server's answer ---------------------------------------------------
function handleResponse(status, data) {
  // Success: correct PIN
  if (status === 200 && data && data.ok === true && Array.isArray(data.poems)) {
    showPoems(normalizePoems(data.poems));
    return;
  }

  const code = data && typeof data.code === "string" ? data.code : "";

  if (code === "wrong_pin") {
    const left = Number(data.attemptsLeft);
    const extra =
      Number.isFinite(left) && left > 0
        ? ` You have ${left} ${left === 1 ? "try" : "tries"} left before a short wait.`
        : " Please be careful: more wrong tries will block you for a while.";
    setStatus(`That PIN or passphrase is not correct.${extra}`, "error");
  } else if (code === "rate_limited") {
    setStatus(
      `Too many wrong attempts. Please try again in ${waitText(data.retryAfterSeconds)}.`,
      "error"
    );
  } else if (code === "not_configured") {
    setStatus(
      "The private collection is not set up on the server yet. The owner needs to set the PIN secret (see README).",
      "error"
    );
  } else if (code === "missing_pin" || code === "bad_request") {
    setStatus("Please type the PIN or passphrase and try again.", "error");
  } else if (status === 404) {
    setStatus(
      "The server function was not found. Check the Project URL in js/config.js and make sure the function is deployed.",
      "error"
    );
  } else if (status === 401 || status === 403) {
    setStatus(
      "The server refused the request. If you just deployed the function, deploy it again with --no-verify-jwt and check your publishable key in js/config.js.",
      "error"
    );
  } else {
    setStatus("Something went wrong on the server. Please try again later.", "error");
  }

  pinInput.focus();
}

// ---- Form submit -----------------------------------------------------------------------
async function handleUnlock(event) {
  event.preventDefault();

  const pin = pinInput.value.trim();

  if (!isSupabaseConfigured()) {
    setStatus(
      "Supabase is not configured yet. Open js/config.js and paste your Project URL and publishable key.",
      "error"
    );
    return;
  }

  if (!pin) {
    setStatus("Please type the PIN or passphrase first.", "error");
    pinInput.focus();
    return;
  }

  setBusy(true);
  setStatus("Checking...", "info");

  try {
    const { status, data } = await requestPrivatePoems(pin);
    handleResponse(status, data);
  } catch (error) {
    if (error && error.name === "AbortError") {
      setStatus("The server took too long to answer. Please try again.", "error");
    } else {
      setStatus(
        "Could not reach the server. Check your internet connection and try again.",
        "error"
      );
    }
  } finally {
    pinInput.value = ""; // never keep the PIN around
    setBusy(false);
    if (lockedPanel.hidden === false) pinInput.focus();
  }
}

// ---- Wire everything up ---------------------------------------------------------------------
unlockForm.addEventListener("submit", handleUnlock);
lockButton.addEventListener("click", () => lock());

showPinCheckbox.addEventListener("change", () => {
  pinInput.type = showPinCheckbox.checked ? "text" : "password";
});

// If the browser restores this page from its "back" cache, make sure it is locked.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) lock();
});
