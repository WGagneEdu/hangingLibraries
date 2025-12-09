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
   STAFF GUARD
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
  } catch {
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
  } catch {
    return { success: false };
  }
}

/* ============================================================
   URL & SEARCH HELPERS
============================================================ */
function getQueryParam(param) {
  return new URL(window.location.href).searchParams.get(param);
}

/* ============================================================
   RENDER HELPERS
============================================================ */
function renderBookCard(book) {
  return `
    <div class="book-card">
      <div class="book-title">${book.Title || "(Untitled)"}</div>
      <div class="book-author">${book.Author_fName || ""} ${book.Author_lName || ""}</div>
      <div class="book-meta">
        ISBN: ${book.ISBN}<br>
        Home: ${book.Book_Home || "N/A"} • Copies: ${book.Book_inventory}
      </div>
    </div>
  `;
}

/* ============================================================
   BOOK MODAL + CHECKOUT
============================================================ */
function enableBookClick(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll(".book-card").forEach(card => {
    card.style.cursor = "pointer";
    card.onclick = () => {
      const title = card.querySelector(".book-title").textContent;
      const author = card.querySelector(".book-author").textContent;
      const meta = card.querySelector(".book-meta").innerHTML;

      const isbn = meta.match(/ISBN:\s*([^<]+)/)[1];
      const inventory = meta.match(/Copies:\s*([^<]+)/)[1];

      openBookModal({ title, author, isbn, inventory });
    };
  });
}

function openBookModal(book) {
  document.getElementById("modalTitle").textContent = book.title;
  document.getElementById("modalAuthor").textContent = book.author;
  document.getElementById("modalISBN").textContent = "ISBN: " + book.isbn;
  document.getElementById("modalInventory").textContent =
    "Copies available: " + book.inventory;

  document.getElementById("checkoutBtn").onclick = async () => {
    if (!isLoggedIn()) {
      alert("You must log in first.");
      window.location.href = "login.html";
      return;
    }

    const { memberId } = getSession();
    const res = await apiPOST("/api/staff/checkout", {
      memberId,
      isbn: book.isbn
    });

    if (res.success) {
      alert("Book checked out successfully.");
      closeBookModal();
      if (window.refreshBooks) window.refreshBooks();
    } else {
      alert(res.message || "Checkout failed.");
    }
  };

  document.getElementById("bookModal").classList.remove("hidden");
}

function closeBookModal() {
  document.getElementById("bookModal").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("closeModalBtn");
  if (closeBtn) closeBtn.onclick = closeBookModal;
});

/* ============================================================
   EXPOSE GLOBALS (✅ REQUIRED ADDITIONS)
============================================================ */
window.setupNavbar = setupNavbar;
window.apiGET = apiGET;
window.apiPOST = apiPOST;
window.enableBookClick = enableBookClick;
window.staffGuard = staffGuard;
window.renderBookCard = renderBookCard;
window.isLoggedIn = isLoggedIn;
window.closeBookModal = closeBookModal;
