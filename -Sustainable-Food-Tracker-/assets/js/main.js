/* ============================================================
   Main Module - Entry Point
============================================================ */
import { initRouter } from './router.js';
import { initImageScanner, initLiveScanner } from './scanner.js';
import { $, openModal, closeModal, renderSearchResults, renderProductDetails } from './ui.js';
import { getProductByBarcode, searchProducts } from './api.js';

document.addEventListener("DOMContentLoaded", () => {
    console.log("EcoFood Tracker Initialized");

    // Initialize Sub-modules
    initRouter();
    initImageScanner();
    initLiveScanner();

    // =============================================
    // GLOBAL MODAL EVENTS
    // =============================================
    const manualEntryBtn = $("action-enter-barcode");
    if (manualEntryBtn) manualEntryBtn.addEventListener("click", openManualBarcodeEntry);

    // =============================================
    // PROFILE SETTINGS (Fixed)
    // =============================================
    const darkModeToggle = $("toggle-dark-mode");
    if (darkModeToggle) {
        // Load save preference
        const isDark = localStorage.getItem("darkMode") === "true";
        if (isDark) {
            document.documentElement.classList.add("dark-mode");
            darkModeToggle.checked = true;
        }

        darkModeToggle.addEventListener("change", (e) => {
            if (e.target.checked) {
                document.documentElement.classList.add("dark-mode");
                localStorage.setItem("darkMode", "true");
            } else {
                document.documentElement.classList.remove("dark-mode");
                localStorage.setItem("darkMode", "false");
            }
        });
    }

    // =============================================
    // SEARCH LOGIC (FIXED)
    // =============================================

    // 1. Hero Search Input
    const heroSearchInput = $("hero-search-input");
    const container = $("home-product-cards");

    if (heroSearchInput) {
        // Clear logic
        heroSearchInput.addEventListener("input", (e) => {
            if (!heroSearchInput.value.trim()) {
                container.innerHTML = "";
                container.classList.add("hidden");
            }
        });

        heroSearchInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                triggerSearch();
            }
        });

        // Button Click Event
        const searchBtn = $("hero-search-btn");
        if (searchBtn) {
            searchBtn.addEventListener("click", triggerSearch);
        }

        async function triggerSearch() {
            const query = heroSearchInput.value.trim();

            if (!query) {
                container.classList.add("hidden");
                return;
            }

            // Show loading state and unhide container
            container.classList.remove("hidden");
            container.innerHTML = "<p>Searching...</p>";

            const products = await searchProducts(query);
            renderSearchResults(products, "home-product-cards");
        }

        // Hide search results if clicked outside
        document.addEventListener("click", (e) => {
            if (!heroSearchInput.contains(e.target) && !container.contains(e.target) && e.target.id !== "hero-search-btn") {
                container.classList.add("hidden");
            }
        });
    }

    // 2. Main Search Page Input
    const mainSearchInput = $("main-search-input");
    const mainResultsContainer = "search-results-container";

    if (mainSearchInput) {
        // Clear logic
        mainSearchInput.addEventListener("input", (e) => {
            if (!mainSearchInput.value.trim()) {
                $(mainResultsContainer).innerHTML = "";
            }
        });

        mainSearchInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                const query = mainSearchInput.value.trim();
                if (!query) return;

                $(mainResultsContainer).innerHTML = "<p>Searching...</p>";
                const products = await searchProducts(query);
                renderSearchResults(products, mainResultsContainer);
            }
        });
    }

    // 3. Click delegation for search results (to show details)
    document.addEventListener("click", async (e) => {
        const item = e.target.closest(".search-result-item");
        if (item) {
            const barcode = item.dataset.barcode;
            if (barcode) {
                // Determine if this is a full product object or just ID
                // Search API returns `_id` as barcode
                const product = await getProductByBarcode(barcode);
                if (product) renderProductDetails(product);
            }
        }
    });

});


/* -------------------------
   MANUAL BARCODE UI
--------------------------*/
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

    submit?.addEventListener("click", async () => {
        const code = input?.value?.trim();
        if (!code) return alert("Please enter a barcode number.");

        // Fetch and show
        const product = await getProductByBarcode(code);
        closeModal();
        if (product) {
            renderProductDetails(product);
        } else {
            alert("Product not found");
        }
    });

    cancel?.addEventListener("click", closeModal);
}
