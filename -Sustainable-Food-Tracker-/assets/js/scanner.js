/* ============================================================
   Scanner Module - Camera and Image Logic
============================================================ */
import { $, openModal, closeModal } from './ui.js';
import { getProductByBarcode } from './api.js';
import { renderProductDetails } from './ui.js';

/* -------------------------
   IMAGE SCAN (Quagga)
--------------------------*/
export function initImageScanner() {
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

            // reset input
            setTimeout(() => { galleryInput.value = ""; }, 200);
        });
    }
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

    // Prefer Quagga if available globally
    if (typeof Quagga !== "undefined" && Quagga.decodeSingle) {
        try {
            Quagga.decodeSingle({
                src: dataUrl,
                numOfWorkers: 0,
                decoder: { readers: ["ean_reader", "upc_reader", "code_128_reader", "ean_8_reader"] },
                locate: true
            }, async (result) => {
                const code = result?.codeResult?.code;
                if (code) {
                    status.textContent = `Barcode found: ${code}`;
                    // Fetch product
                    const product = await getProductByBarcode(code);
                    closeModal();
                    if (product) {
                        renderProductDetails(product);
                    } else {
                        alert(`Barcode ${code} found, but product not in database.`);
                    }

                } else {
                    status.textContent = `No barcode detected. Try a clearer photo.`;
                }
            });
        } catch (err) {
            console.error("Quagga decode error:", err);
            status.textContent = `Scanning failed.`;
        }
    } else {
        status.innerHTML = `Image scanning requires QuaggaJS.`;
    }
}


/* -------------------------
   LIVE SCANNER (Html5Qrcode)
--------------------------*/
let html5QrCode = null;

export function initLiveScanner() {
    const scanButtons = [
        document.getElementById("hero-start-scanning"),
        document.getElementById("action-scan-barcode")
    ];

    scanButtons.forEach(btn => {
        if (btn) btn.addEventListener("click", openScanner);
    });

    // Close logic is handled by global overlay click in ui.js, but we need to stop stream
    const scannerClose = document.getElementById("scanner-close-btn");
    const scannerOverlay = document.getElementById("scanner-overlay");

    if (scannerClose) scannerClose.addEventListener("click", stopScanner);
    if (scannerOverlay) scannerOverlay.addEventListener("click", stopScanner);
}

async function openScanner() {
    const scannerOverlay = document.getElementById("scanner-overlay");
    const scannerModal = document.getElementById("scanner-modal");
    const scannerStatus = document.getElementById("scanner-status");

    if (scannerOverlay) scannerOverlay.classList.remove("hidden");
    if (scannerModal) scannerModal.classList.remove("hidden");
    if (scannerStatus) scannerStatus.textContent = "Initializing camera...";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("scanner-view");
    }

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
                await stopScanner();
                const product = await getProductByBarcode(decodedText);
                if (product) {
                    renderProductDetails(product);
                } else {
                    alert(`Product not found for barcode: ${decodedText}`);
                }
            },
            (errorMessage) => {
                // ignore errors during scanning
            }
        );
        if (scannerStatus) scannerStatus.textContent = "Scanning...";
    } catch (err) {
        if (scannerStatus) scannerStatus.textContent = "Camera error or permission denied.";
        console.error(err);
    }
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch (e) { console.log(e); }
    }
    const scannerOverlay = document.getElementById("scanner-overlay");
    const scannerModal = document.getElementById("scanner-modal");
    if (scannerOverlay) scannerOverlay.classList.add("hidden");
    if (scannerModal) scannerModal.classList.add("hidden");
}
