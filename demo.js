// demo.js — Navigation and Page Linking for Hanging Libraries

document.addEventListener("DOMContentLoaded", () => {
  // Map of page routes (assumes all files are in the same folder)
  const routes = {
    home: "HomePage.html",
    search: "Search page.html",
    browse: "Browse page.html",
    results: "result page.html",
    profile: "Edit Profile.html",
  };

  // Apply navbar link logic dynamically if buttons exist
  const navButtons = {
    search: document.querySelector(".nav-btn:nth-child(1)"),
    browse: document.querySelector(".nav-btn:nth-child(2)"),
    profile: document.querySelector(".nav-btn:nth-child(3)"),
  };

  if (navButtons.search) {
    navButtons.search.addEventListener("click", () => {
      window.location.href = routes.search;
    });
  }

  if (navButtons.browse) {
    navButtons.browse.addEventListener("click", () => {
      window.location.href = routes.browse;
    });
  }

  if (navButtons.profile) {
    navButtons.profile.addEventListener("click", () => {
      window.location.href = routes.profile;
    });
  }

  // Special handling for Search page input → Result page
  const searchInput = document.querySelector("input[type='text']");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length > 0) {
          window.location.href = `${routes.results}?query=${encodeURIComponent(query)}`;
        } else {
          alert("Please enter a search term.");
        }
      }
    });
  }

  console.log("demo.js loaded successfully ✅");
});
