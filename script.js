document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready — scripts starting");

  let nutritionChart = null;

  function safeGet(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} not found`);
    return el;
  }

  const navLinks = document.querySelectorAll(".nav-link, .logo") || [];
  const pages = document.querySelectorAll(".page") || [];
  const burger = safeGet("burger");
  const navLinksContainer = safeGet("nav-links");
  const darkModeToggle = safeGet("toggle-dark-mode");
  const searchInput = safeGet("main-search-input");
  const modalContainer = safeGet("modal-container");
  const modalOverlay = safeGet("modal-overlay");
  const modalCloseBtn = safeGet("modal-close-btn");

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const pageName = link.dataset.page;
      if (!pageName) return;

      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      showPage(pageName);
    });
  });

  function showPage(pageName) {
    pages.forEach(page => {
      if (page.id === `page-${pageName}`) page.classList.add("active");
      else page.classList.remove("active");
    });

    if (pageName === "search") {
      setTimeout(() => {
        const inp = safeGet("main-search-input");
        if (inp) inp.focus();
      }, 150);
    }
  }

  if (burger && navLinksContainer) {
    burger.addEventListener("click", () => {
      burger.classList.toggle("active");
      navLinksContainer.classList.toggle("active");
    });
  }

  if (darkModeToggle) {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark-mode");
      darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener("change", () => {
      if (darkModeToggle.checked) {
        document.documentElement.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") searchProducts();
    });
  }

  if (modalCloseBtn && modalContainer && modalOverlay) {
    modalCloseBtn.addEventListener("click", () => {
      modalContainer.classList.add("hidden");
      modalOverlay.classList.add("hidden");
    });
  }

  async function searchProducts() {
    const query = (searchInput && searchInput.value.trim()) || "";
    const container = safeGet("search-results-container");
    if (!container) return;

    if (!query) {
      container.innerHTML = "<p>Type something to search!</p>";
      return;
    }

    container.innerHTML = "<p>Searching...</p>";

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=20&json=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.products || data.products.length === 0) {
        container.innerHTML = "<p>No products found.</p>";
        return;
      }

      container.innerHTML = "";
      data.products.forEach(product => {
        const code = product.code || "";
        const img = product.image_front_small_url || "";
        const name = product.product_name || "No name";
        const brand = product.brands || "Unknown brand";
        const grade = (product.nutrition_grade_fr || "c").toUpperCase();

        const item = document.createElement("div");
        item.className = "search-result-item";
        item.tabIndex = 0;

        item.innerHTML = `
          <img src="${img}">
          <div class="search-result-info">
            <h4>${escapeHtml(name)}</h4>
            <p>${escapeHtml(brand)}</p>
          </div>
          <span class="grade-badge grade-${grade.toLowerCase()}">${grade}</span>
        `;

        item.addEventListener("click", () => openProductDetails(code));
        container.appendChild(item);
      });

    } catch (err) {
      console.error("Search error:", err);
      container.innerHTML = "<p>Error searching products.</p>";
    }
  }

  async function openProductDetails(code) {
    if (!code) return;

    const content = safeGet("modal-content");
    if (!content) return;

    try {
      const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const p = data.product;

      if (!p) {
        content.innerHTML = "<p>Product details not found.</p>";
        modalOverlay.classList.remove("hidden");
        modalContainer.classList.remove("hidden");
        return;
      }

      const img = p.image_front_small_url || "";
      const name = p.product_name || "No name";
      const brands = p.brands || "Unknown";
      const quantity = p.quantity || "N/A";
      const nutr = p.nutriments || {};

      content.innerHTML = `
        <div class="product-detail-header">
          <img src="${img}" alt="${escapeHtml(name)}">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <p><b>Brand:</b> ${escapeHtml(brands)}</p>
            <p><b>Quantity:</b> ${escapeHtml(quantity)}</p>
          </div>
        </div>

        <h4>Nutritional Chart (per 100g)</h4>
        <div class="chart-container">
          <canvas id="nutritionChart"></canvas>
        </div>
      `;

      modalOverlay.classList.remove("hidden");
      modalContainer.classList.remove("hidden");

      drawNutritionChart(
        nutr.fat_100g ?? nutr.fat ?? 0,
        nutr.carbohydrates_100g ?? nutr.carbohydrates ?? 0,
        nutr.proteins_100g ?? nutr.proteins ?? 0,
        nutr.sugars_100g ?? nutr.sugars ?? 0
      );

    } catch (err) {
      console.error("Details error:", err);
      content.innerHTML = "<p>Error loading product details.</p>";
      modalOverlay.classList.remove("hidden");
      modalContainer.classList.remove("hidden");
    }
  }

  function drawNutritionChart(fat, carbs, protein, sugar) {
    const canvas = document.getElementById("nutritionChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (nutritionChart) nutritionChart.destroy();

    nutritionChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Fat", "Carbs", "Protein", "Sugar"],
        datasets: [{
          data: [fat, carbs, protein, sugar]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.searchProducts = searchProducts;
  window.openProductDetails = openProductDetails;

  console.log("scripts.js initialized");
});


// ----------------------
// HOME SEARCH
// ----------------------

const heroInput = document.getElementById("hero-search-input");
const homeCardContainer = document.getElementById("home-product-cards");

if (heroInput) {
  heroInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") homeSearchProduct();
  });
}

async function homeSearchProduct() {
  const query = heroInput.value.trim();
  if (!query) return;

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=1&json=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.products || data.products.length === 0) return;

    const p = data.products[0];

    const img = p.image_front_small_url || "https://via.placeholder.com/80";
    const name = p.product_name || "Unknown";
    const code = p.code;
    const grade = (p.nutrition_grade_fr || "C").toUpperCase();

    addHomeMiniCard(name, img, code, grade);

  } catch (err) {
    console.error("Home search error:", err);
  }
}

function addHomeMiniCard(name, img, code, grade) {
  if (homeCardContainer.children.length >= 4) {
    homeCardContainer.removeChild(homeCardContainer.firstElementChild);
  }

  const card = document.createElement("div");
  card.className = "home-mini-card";

  card.innerHTML = `
    <img src="${img}">
    <p>${name}</p>
    <span class="mini-grade mini-grade-${grade.toLowerCase()}">${grade}</span>
  `;

  card.addEventListener("click", () => openProductDetails(code));

  homeCardContainer.appendChild(card);
}
