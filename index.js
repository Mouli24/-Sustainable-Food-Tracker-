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
   STARTUP LOG / Guards
--------------------------*/
console.log("index.js loaded - features: manual barcode, image scan (Quagga), live scan (BarcodeDetector), OpenFoodFacts search/details");
// ==================== BARCODE SCANNER ==================== //

let qr = null;
let scanning = false;

// Elements
const scannerModal = document.getElementById("scanner-modal");
const scannerOverlay = document.getElementById("scanner-overlay");
const scannerClose = document.getElementById("scanner-close-btn");
const scannerStatus = document.getElementById("scanner-status");

const scanButtons = [
    document.getElementById("hero-start-scanning"),
    document.getElementById("action-scan-barcode")
];

// Fetch product from OpenFoodFacts
async function fetchProduct(barcode) {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 0) {
            alert("❌ Product not found");
            return;
        }

        const p = data.product;

        alert(
            `✔️ Product Found!\n\n` +
            `Name: ${p.product_name}\n` +
            `Brand: ${p.brands}\n` +
            `Nutri-Score: ${p.nutriscore_grade}`
        );

    } catch (e) {
        alert("Error fetching OpenFoodFacts API");
        console.log(e);
    }
}

// Open scanner
async function openScanner() {
    if (scanning) return;

    scannerOverlay.classList.remove("hidden");
    scannerModal.classList.remove("hidden");
    scannerStatus.textContent = "Opening camera…";

    if (!qr) {
        qr = new Html5Qrcode("scanner-view");
    }

    scanning = true;

    try {
        await qr.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },

            async decodedText => {
                await closeScanner();
                fetchProduct(decodedText.trim());
            }
        );

        scannerStatus.textContent = "Scanning…";

    } catch (err) {
        scannerStatus.textContent = "Camera error. Check permissions.";
        console.error(err);
    }
}

// Close scanner
async function closeScanner() {
    if (qr && scanning) {
        try {
            await qr.stop();
        } catch (e) {}
    }
    scanning = false;

    scannerOverlay.classList.add("hidden");
    scannerModal.classList.add("hidden");
}

// Attach events
scanButtons.forEach(btn => {
    if (btn) btn.addEventListener("click", openScanner);
});

scannerClose.addEventListener("click", closeScanner);
scannerOverlay.addEventListener("click", closeScanner);

// ==================== MANUAL BARCODE ENTRY ==================== //

const enterBarcodeBtn = document.getElementById("action-enter-barcode");

const barcodeModal = document.getElementById("barcode-modal");
const barcodeOverlay = document.getElementById("barcode-overlay");
const barcodeClose = document.getElementById("barcode-close-btn");

const barcodeInput = document.getElementById("barcode-input");
const barcodeSearchBtn = document.getElementById("barcode-search-btn");
const barcodeResult = document.getElementById("barcode-result");

// Open modal
enterBarcodeBtn.addEventListener("click", () => {
    barcodeModal.classList.remove("hidden");
    barcodeOverlay.classList.remove("hidden");
});

// Close modal
barcodeClose.addEventListener("click", closeBarcodeModal);
barcodeOverlay.addEventListener("click", closeBarcodeModal);

function closeBarcodeModal() {
    barcodeModal.classList.add("hidden");
    barcodeOverlay.classList.add("hidden");
    barcodeInput.value = "";
    barcodeResult.innerHTML = "";
}

// Search Product
barcodeSearchBtn.addEventListener("click", () => {
    const code = barcodeInput.value.trim();
    if (code.length < 4) {
        barcodeResult.innerHTML = `<p style="color:red;">Please enter a valid barcode.</p>`;
        return;
    }
    fetchBarcodeProduct(code);
});

// API Fetch Function
async function fetchBarcodeProduct(code) {
    barcodeResult.innerHTML = `<p>Loading product info...</p>`;

    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
        const data = await res.json();

        if (data.status === 0) {
            barcodeResult.innerHTML = `<p style="color:red;">❌ Product not found</p>`;
            return;
        }

        const p = data.product;

        // Clean UI output — NO raw JSON
        barcodeResult.innerHTML = `
            <h3>${p.product_name || "Unnamed Product"}</h3>
            <p><b>Brand:</b> ${p.brands || "Unknown"}</p>
            <p><b>Quantity:</b> ${p.quantity || "N/A"}</p>
            <p><b>Nutri-Score:</b> ${p.nutriscore_grade?.toUpperCase() || "N/A"}</p>
            <p><b>Eco-Score:</b> ${p.ecoscore_grade?.toUpperCase() || "N/A"}</p>
            
            <img src="${p.image_front_small_url || p.image_url}" 
                 alt="Product Image"
                 style="width:120px; margin-top:10px; border-radius:8px;">
        `;
    }
    catch (error) {
        barcodeResult.innerHTML = `<p style="color:red;">Error fetching data.</p>`;
        console.log(error);
    }
}
