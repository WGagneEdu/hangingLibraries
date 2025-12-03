// public/app.js

/* ============================================================
   SESSION HELPERS
============================================================ */
function getSession() {
  return {
    memberId: localStorage.getItem("sessionMemberId"),
    role: localStorage.getItem("sessionRole"),
  };
}

function isLoggedIn() {
  return !!localStorage.getItem("sessionMemberId");
}

function isStaff() {
  return localStorage.getItem("sessionRole") === "staff";
}

function logout() {
  localStorage.removeItem("sessionMemberId");
  localStorage.removeItem("sessionRole");
  window.location.href = "login.html";
}

/* ============================================================
   NAVBAR SETUP
============================================================ */
function setupNavbar() {
  const loginBtn = document.getElementById("loginLogoutBtn");
  const profileBtn = document.getElementById("profileBtn");
  const staffBtn = document.getElementById("staffBtn");
  const session = getSession();

  if (loginBtn) {
    if (isLoggedIn()) {
      loginBtn.textContent = "🚪 LOGOUT";
      loginBtn.onclick = logout;
    } else {
      loginBtn.textContent = "🔐 LOGIN";
      loginBtn.onclick = () => (window.location.href = "login.html");
    }
  }

  if (profileBtn) {
    profileBtn.onclick = () => {
      if (!isLoggedIn()) {
        alert("Please log in first.");
        window.location.href = "login.html";
        return;
      }
      window.location.href = "profile.html";
    };
  }

  if (staffBtn) {
    if (session.role === "staff") {
      staffBtn.style.display = "inline-flex";
      staffBtn.onclick = () => (window.location.href = "staff.html");
    } else {
      staffBtn.style.display = "none";
    }
  }
}

/* ============================================================
   STAFF GUARD (protect staff pages)
============================================================ */
function staffGuard() {
  const { memberId, role } = getSession();
  if (!memberId || role !== "staff") {
    alert("Staff access only. Please log in as staff.");
    window.location.href = "login.html";
  }
}

/* ============================================================
   API HELPERS
============================================================ */
async function apiGET(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error("GET error:", e);
    return { success: false };
  }
}

async function apiPOST(url, body) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error("POST error:", e);
    return { success: false };
  }
}

/* ============================================================
   URL & SEARCH HELPERS
============================================================ */
function getQueryParam(param) {
  const url = new URL(window.location.href);
  return url.searchParams.get(param);
}

function attachSearchHandler(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = input.value.trim();
      if (!query) return;
      window.location.href =
        "results.html?query=" + encodeURIComponent(query);
    }
  });
}

/* ============================================================
   RENDER HELPERS
============================================================ */
function renderBookCard(book) {
  return `
    <div class="book-card">
      <div class="book-title">${book.Title || "(Untitled)"}</div>
      <div class="book-author">${book.Author_fName || ""} ${
    book.Author_lName || ""
  }</div>
      <div class="book-meta">
        ISBN: ${book.ISBN || "N/A"}<br>
        Home: ${book.Book_Home || "N/A"} • Copies: ${
    book.Book_inventory ?? "N/A"
  }
      </div>
    </div>
  `;
}

function renderCheckoutItem(item) {
  return `
    <div class="checkout-item">
      <div>
        <div class="book-title">${item.Title || "(Unknown Title)"} (${
    item.Item_Code
  })</div>
        <div class="meta">
          Member: #${item.Member_IDNum} – ${item.First_Name || ""} ${
    item.Last_Name || ""
  }<br>
          Checked Out: ${item.Checkout_Date || "N/A"} |
          Due: ${item.Due_Date || "N/A"}
        </div>
      </div>
      <button class="btn-small" data-logid="${item.Log_ID}">Mark Returned</button>
    </div>
  `;
}

function renderWaitlistEntry(entry) {
  return `
    <div class="waitlist-entry">
      <span>#${entry.Hold_Num} – Member #${entry.MEMBER_IDNum} (${
    entry.First_Name || ""
  } ${entry.Last_Name || ""})</span>
      <span>
        From ${entry.Hold_Date || "N/A"} to ${
    entry.End_Hold_Date || "N/A"
  }
        <button class="btn-small" data-holdnum="${entry.Hold_Num}">Remove</button>
      </span>
    </div>
  `;
}

/* ============================================================
   EXPOSE GLOBALS
   (so you can call these from inline scripts)
============================================================ */
window.getSession = getSession;
window.isLoggedIn = isLoggedIn;
window.isStaff = isStaff;
window.logout = logout;
window.setupNavbar = setupNavbar;
window.staffGuard = staffGuard;
window.apiGET = apiGET;
window.apiPOST = apiPOST;
window.getQueryParam = getQueryParam;
window.attachSearchHandler = attachSearchHandler;
window.renderBookCard = renderBookCard;
window.renderCheckoutItem = renderCheckoutItem;
window.renderWaitlistEntry = renderWaitlistEntry;
