/* ============================================================
   NAVIGATION (FIXED & ROBUST)
============================================================ */
const navLinks = document.querySelectorAll(".nav-link");
const logo = document.querySelector(".logo");
const pages = document.querySelectorAll(".page");
const burger = document.getElementById("burger");
const navLinksContainer = document.getElementById("nav-links");

function showPage(name) {
    pages.forEach(p => {
        if (p.id === `page-${name}`) p.classList.add("active");
        else p.classList.remove("active");
    });
}

// click on nav items
navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (!page) return;

        navLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");

        showPage(page);
        closeMobileMenu();
    });
});

// logo → go home
logo?.addEventListener("click", () => {
    navLinks.forEach(l => l.classList.remove("active"));
    showPage("home");
    closeMobileMenu();
});

// mobile menu toggle
burger?.addEventListener("click", () => {
    burger.classList.toggle("active");
    navLinksContainer.classList.toggle("active");
});

function closeMobileMenu() {
    burger?.classList.remove("active");
    navLinksContainer?.classList.remove("active");
}

/* ============================================================
   index.js - All-in-one: barcode (live / image / manual) + API search
   Dependencies (include in HTML):
     - QuaggaJS (optional for image scanning): https://unpkg.com/quagga@0.12.1/dist/quagga.min.js
     - Chart.js (for nutrition chart) : https://cdn.jsdelivr.net/npm/chart.js
============================================================ */

/* -------------------------
   HELPERS
--------------------------*/
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

let nutritionChart = null;

/* -------------------------
   BASIC UI / MODAL
--------------------------*/
function openModal(html) {
  const modal = $("modal-container");
  const overlay = $("modal-overlay");
  if (!modal || !overlay) {
    console.warn("Modal elements (#modal-container, #modal-overlay) missing.");
    return;
  }
  modal.innerHTML = html;
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  // wire close buttons inside modal
  const closeBtns = modal.querySelectorAll(".modal-close, #modal-close-btn, #close");
  closeBtns.forEach(b => b.addEventListener("click", closeModal));
}

function closeModal() {
  stopLiveStream();
  const modal = $("modal-container");
  const overlay = $("modal-overlay");
  if (modal) modal.classList.add("hidden");
  if (overlay) overlay.classList.add("hidden");
}

/* -------------------------
   SEARCH (OpenFoodFacts)
--------------------------*/
const searchInput = $("main-search-input");
const searchBtn = $("search-btn");
const searchResultsContainer = $("search-results-container");

async function searchProducts() {
  const q = searchInput?.value?.trim();
  const container = searchResultsContainer;
  if (!container) return;

  if (!q) {
    container.innerHTML = `<p class="muted">Type something to search.</p>`;
    return;
  }

  container.innerHTML = `<p class="muted">Searching…</p>`;

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&page_size=20&json=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      container.innerHTML = `<p>No products found.</p>`;
      return;
    }

    container.innerHTML = "";
    data.products.forEach(p => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.innerHTML = `
        <img class="result-thumb" src="${p.image_front_small_url || ""}" alt="${(p.product_name || "product")}">
        <div class="result-meta">
          <h4>${p.product_name || "Unnamed"}</h4>
          <p class="brand">${p.brands || "Unknown brand"}</p>
        </div>
        <div class="result-grade">${(p.nutrition_grade_fr || "").toUpperCase()}</div>
      `;
      item.addEventListener("click", () => openProductDetails(p.code));
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Search error:", err);
    container.innerHTML = `<p>Error searching products.</p>`;
  }
}

// keyboard + click wiring
searchInput?.addEventListener("keyup", (e) => { if (e.key === "Enter") searchProducts(); });
searchBtn?.addEventListener("click", searchProducts);

/* -------------------------
   PRODUCT DETAILS (modal)
--------------------------*/
async function openProductDetails(code) {
  const modalHtml = `
    <button id="close" class="modal-close">&times;</button>
    <div class="modal-inner">
      <div id="modal-content">
        <p>Loading product details…</p>
      </div>
    </div>
  `;
  openModal(modalHtml);

  const content = $("modal-container")?.querySelector("#modal-content");
  if (!content) return;

  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;
    const res = await fetch(url);
    const data = await res.json();
    const p = data.product;

    if (!p) {
      content.innerHTML = `<p>Product not found.</p>`;
      return;
    }

    const nutr = p.nutriments || {};
    const image = p.image_front_small_url || "";
    const name = p.product_name || "No name";
    const brand = p.brands || "Unknown";

    content.innerHTML = `
      <div class="product-detail">
        <div class="product-header">
          <img src="${image}" class="product-thumb" alt="${name}">
          <div>
            <h3>${name}</h3>
            <p><strong>Brand:</strong> ${brand}</p>
            <p><strong>Code:</strong> ${code}</p>
          </div>
        </div>

        <h4>Nutritional values (per 100g)</h4>
        <div class="chart-wrap" style="height:220px;">
          <canvas id="nutritionChart"></canvas>
        </div>

        <div class="nutr-list">
          <p><b>Energy:</b> ${nutr["energy-kcal_100g"] ?? nutr["energy-kj_100g"] ?? "N/A"}</p>
          <p><b>Fat:</b> ${nutr.fat_100g ?? "0"} g</p>
          <p><b>Carbs:</b> ${nutr.carbohydrates_100g ?? "0"} g</p>
          <p><b>Protein:</b> ${nutr.proteins_100g ?? "0"} g</p>
          <p><b>Sugars:</b> ${nutr.sugars_100g ?? "0"} g</p>
        </div>

        <div style="margin-top:12px;">
          <button id="modal-close-btn" class="btn">Close</button>
        </div>
      </div>
    `;

    // draw chart (Chart.js)
    drawNutritionChart(
      Number(nutr.fat_100g) || 0,
      Number(nutr.carbohydrates_100g) || 0,
      Number(nutr.proteins_100g) || 0,
      Number(nutr.sugars_100g) || 0
    );
  } catch (err) {
    console.error("Product detail error:", err);
    content.innerHTML = `<p>Error loading product details.</p>`;
  }
}

function drawNutritionChart(fat, carbs, protein, sugar) {
  const ctx = $("nutritionChart")?.getContext?.("2d");
  if (!ctx || typeof Chart === "undefined") return;
  if (nutritionChart) nutritionChart.destroy();

  nutritionChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Fat", "Carbs", "Protein", "Sugar"],
      datasets: [{
        data: [fat, carbs, protein, sugar],
        backgroundColor: ["#F39C12","#27AE60","#2980B9","#C0392B"]
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

/* -------------------------
   MANUAL BARCODE ENTRY
--------------------------*/
$("action-enter-barcode")?.addEventListener("click", openManualBarcodeEntry);

function openManualBarcodeEntry() {
  openModal(`
    <button id="close" class="modal-close">&times;</button>
    <div class="manual-entry">
      <h3>Enter Barcode</h3>
      <input id="manual-barcode-input" placeholder="Enter barcode number" style="width:100%;padding:8px;margin-top:8px;">
      <div style="margin-top:10px;">
        <button id="manual-submit" class="btn btn-primary">Submit</button>
        <button id="manual-cancel" class="btn" style="margin-left:6px;">Cancel</button>
      </div>
    </div>
  `);

  const submit = $("modal-container")?.querySelector("#manual-submit");
  const cancel = $("modal-container")?.querySelector("#manual-cancel");
  const input = $("modal-container")?.querySelector("#manual-barcode-input");

  submit?.addEventListener("click", () => {
    const code = input?.value?.trim();
    if (!code) return alert("Please enter a barcode number.");
    closeModal();
    // open product details via API
    openProductDetails(code);
  });

  cancel?.addEventListener("click", closeModal);
}

/* -------------------------
   IMAGE UPLOAD SCAN (Quagga)
--------------------------*/
const galleryBtn = $("action-upload-image");
const galleryInput = $("image-upload-input");

if (galleryBtn) galleryBtn.addEventListener("click", () => galleryInput?.click());

if (galleryInput) {
  galleryInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => openImageScanModal(reader.result);
    reader.readAsDataURL(file);

    // reset input so same file can be chosen again later
    setTimeout(() => { galleryInput.value = ""; }, 200);
  });
}

function openImageScanModal(dataUrl) {
  openModal(`
    <button id="close" class="modal-close">&times;</button>
    <div class="image-scan">
      <h3>Scanning Image</h3>
      <img src="${dataUrl}" style="width:100%;border-radius:12px;margin-top:8px;" alt="upload">
      <p id="scan-status" class="muted">Trying to decode barcode...</p>
    </div>
  `);

  const status = $("modal-container")?.querySelector("#scan-status");
  // Prefer Quagga if available
  if (typeof Quagga !== "undefined" && Quagga.decodeSingle) {
    try {
      Quagga.decodeSingle({
        src: dataUrl,
        numOfWorkers: 0,
        decoder: { readers: ["ean_reader","upc_reader","code_128_reader","ean_8_reader"] },
        locate: true
      }, (result) => {
        const code = result?.codeResult?.code;
        if (code) {
          status.textContent = `Barcode found: ${code}`;
          setTimeout(() => { closeModal(); openProductDetails(code); }, 700);
        } else {
          status.textContent = `No barcode detected. Try a clearer photo.`;
        }
      });
    } catch (err) {
      console.error("Quagga decode error:", err);
      status.textContent = `Scanning failed.`;
    }
  } else {
    // Quagga not available — alert and ask user to install or use manual entry
    status.innerHTML = `Image scanning requires QuaggaJS. Include Quagga in your HTML or use manual entry.`;
  }
}

/* -------------------------
   LIVE CAMERA SCAN (BarcodeDetector API)
--------------------------*/
$("action-scan-barcode")?.addEventListener("click", openLiveScanner);

let liveStream = null;
let liveInterval = null;

function openLiveScanner() {
  openModal(`
    <button id="close" class="modal-close">&times;</button>
    <div class="live-scan">
      <h3>Live Barcode Scanner</h3>
      <video id="live-cam" autoplay playsinline style="width:100%;border-radius:12px;margin-top:8px;"></video>
      <p id="live-status" class="muted" style="margin-top:8px;">Point camera at a barcode</p>
      <div style="margin-top:8px;">
        <button id="live-cancel" class="btn">Cancel</button>
      </div>
    </div>
  `);

  const cancel = $("modal-container")?.querySelector("#live-cancel");
  cancel?.addEventListener("click", closeModal);

  startLiveBarcodeScan();
}

async function startLiveBarcodeScan() {
  const statusEl = $("modal-container")?.querySelector("#live-status");
  const video = $("modal-container")?.querySelector("#live-cam");
  if (!video) return;

  // feature detect
  if (!("BarcodeDetector" in window)) {
    statusEl.textContent = "BarcodeDetector not supported in this browser. Try image upload or manual entry.";
    return;
  }

  try {
    liveStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
    video.srcObject = liveStream;
  } catch (err) {
    console.error("Camera error:", err);
    statusEl.textContent = "Camera access denied or unavailable.";
    return;
  }

  // instantiate detector (allow common formats)
  const detector = new BarcodeDetector({
    formats: ["ean_13","ean_8","code_128","upc_a","upc_e"]
  });

  // clear old interval
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }

  liveInterval = setInterval(async () => {
    try {
      const results = await detector.detect(video);
      if (results && results.length > 0) {
        const code = results[0].rawValue;
        // stop & show
        stopLiveStream();
        closeModal();
        // open product details automatically
        openProductDetails(code);
      }
    } catch (err) {
      // ignore intermittent decode errors
      console.debug("Detector error:", err);
    }
  }, 250);
}

function stopLiveStream() {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  if (liveStream) {
    liveStream.getTracks().forEach(t => t.stop());
    liveStream = null;
  }
}

/* -------------------------
   STARTUP LOG / Guards
--------------------------*/
console.log("index.js loaded - features: manual barcode, image scan (Quagga), live scan (BarcodeDetector), OpenFoodFacts search/details");