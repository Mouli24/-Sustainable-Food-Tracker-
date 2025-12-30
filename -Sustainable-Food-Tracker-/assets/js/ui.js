/* ============================================================
   UI Module - DOM Helpers, Modals, and Rendering
============================================================ */

export const $ = (id) => document.getElementById(id);
export const qs = (sel) => document.querySelector(sel);
export const qsa = (sel) => Array.from(document.querySelectorAll(sel));

/* -------------------------
   MODAL LOGIC
--------------------------*/
export function openModal(htmlContent) {
    const modal = $("modal-container");
    const overlay = $("modal-overlay");

    if (!modal || !overlay) {
        console.warn("Modal elements (#modal-container, #modal-overlay) missing.");
        return;
    }

    // Set content
    const contentContainer = $("modal-content");
    if (contentContainer) {
        contentContainer.innerHTML = htmlContent;
    } else {
        modal.innerHTML = `<button id="modal-close-btn" class="modal-close">&times;</button><div id="modal-content">${htmlContent}</div>`;
    }

    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");

    // Wire close buttons
    const closeBtns = modal.querySelectorAll(".modal-close, #modal-close-btn, #close");
    closeBtns.forEach(b => b.addEventListener("click", closeModal));
}

export function closeModal() {
    const modal = $("modal-container");
    const overlay = $("modal-overlay");
    if (modal) modal.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");

    // Also close other overlays if they exist
    const scannerOverlay = $("scanner-overlay");
    const scannerModal = $("scanner-modal");
    const barcodeOverlay = $("barcode-overlay");
    const barcodeModal = $("barcode-modal");

    if (scannerOverlay) scannerOverlay.classList.add("hidden");
    if (scannerModal) scannerModal.classList.add("hidden");
    if (barcodeOverlay) barcodeOverlay.classList.add("hidden");
    if (barcodeModal) barcodeModal.classList.add("hidden");
}

/* -------------------------
   RENDER SEARCH RESULTS
--------------------------*/
export function renderSearchResults(products, containerId) {
    const container = $(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `<p class="text-center">No products found. Try a different term.</p>`;
        return;
    }

    const html = products.map(p => {
        const name = p.product_name || "Unknown Product";
        const brand = p.brands || "Unknown Brand";
        const image = p.image_small_url || p.image_url || "https://via.placeholder.com/60?text=No+Img";
        const grade = p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : "?";
        const gradeClass = p.nutriscore_grade ? `grade-badge-${p.nutriscore_grade.toLowerCase()}` : "grade-badge-e"; // Default to gray/red if unknown?

        return `
        <div class="search-result-item" data-barcode="${p._id}">
            <img src="${image}" alt="${name}">
            <div class="search-result-info">
                <h4>${name}</h4>
                <p>${brand}</p>
            </div>
            <div class="grade-badge ${gradeClass}">${grade}</div>
        </div>
        `;
    }).join("");

    container.innerHTML = html;
}

export function renderProductDetails(p) {
    const name = p.product_name || "Unnamed Product";
    const brand = p.brands || "Unknown";
    const img = p.image_front_url || p.image_url || "";
    const nutri = p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : "N/A";
    const eco = p.ecoscore_grade ? p.ecoscore_grade.toUpperCase() : "N/A";
    const novas = p.nova_group || "N/A";

    // Nutrition Levels
    const levels = p.nutrient_levels || {};
    const fat = levels.fat || "unknown";
    const salt = levels.salt || "unknown";
    const sugar = levels.sugars || "unknown";
    const saturated = levels['saturated-fat'] || "unknown";

    const detailHtml = `
        <div class="product-detail-header">
            <img src="${img}" alt="${name}">
            <div>
                <h3>${name}</h3>
                <p>${brand}</p>
                <div class="product-detail-badges">
                    <span class="tag">Nutri-Score: ${nutri}</span>
                    <span class="tag">Eco-Score: ${eco}</span>
                    <span class="tag">NOVA: ${novas}</span>
                </div>
            </div>
        </div>

        <div class="product-detail-grid">
            <div class="card">
                <h4>Nutrition Levels</h4>
                <ul style="font-size: 0.9rem; margin-top: 0.5rem;">
                    <li>Fat: <b>${fat}</b></li>
                    <li>Saturated Fat: <b>${saturated}</b></li>
                    <li>Sugars: <b>${sugar}</b></li>
                    <li>Salt: <b>${salt}</b></li>
                </ul>
            </div>
            <div class="card">
                <h4>Ingredients</h4>
                <p style="font-size: 0.85rem; max-height: 100px; overflow-y: auto;">
                    ${p.ingredients_text || "No ingredients listed."}
                </p>
            </div>
        </div>
        
        <!-- CHARTS SECTION -->
        <div class="product-charts" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem;">
            <div class="card" style="height: 250px;">
                <canvas id="macrosBarChart"></canvas>
            </div>
            <div class="card" style="height: 250px;">
                <canvas id="energyPieChart"></canvas>
            </div>
        </div>

        <div style="margin-top: 1.5rem; text-align: center;">
             <button class="btn btn-secondary" id="close-detail-btn">Close</button>
        </div>
    `;

    openModal(detailHtml);

    // Bind close button and Init Charts
    setTimeout(() => {
        const btn = document.getElementById("close-detail-btn");
        if (btn) btn.addEventListener("click", closeModal);

        // NUTRITION DATA
        const nutriments = p.nutriments || {};
        const fat100 = nutriments.fat_100g || 0;
        const carbs100 = nutriments.carbohydrates_100g || 0;
        const sugars100 = nutriments.sugars_100g || 0;
        const proteins100 = nutriments.proteins_100g || 0;
        const salt100 = nutriments.salt_100g || 0;
        const energyKcal = nutriments["energy-kcal_100g"] || 0;

        // 1. BAR CHART: Macros (g per 100g)
        const ctxBar = document.getElementById('macrosBarChart');
        if (ctxBar && typeof Chart !== 'undefined') {
            new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: ['Fat', 'Carbs', 'Sugars', 'Protein', 'Salt'],
                    datasets: [{
                        label: 'g per 100g',
                        data: [fat100, carbs100, sugars100, proteins100, salt100],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Nutrients (g/100g)' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // 2. PIE CHART: Energy / Caloric Contribution (Approx)
        // Note: Calories comes from Fat(9), Protein(4), Carbs(4). This is an approximation for visual.
        const calsFat = fat100 * 9;
        const calsCarbs = carbs100 * 4;
        const calsProtein = proteins100 * 4;

        const ctxPie = document.getElementById('energyPieChart');
        if (ctxPie && typeof Chart !== 'undefined') {
            new Chart(ctxPie, {
                type: 'pie',
                data: {
                    labels: ['Fat', 'Carbs', 'Protein'],
                    datasets: [{
                        label: 'Calories (kcal)',
                        data: [calsFat, calsCarbs, calsProtein],
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#4BC0C0'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Energy Breakdown Est.' }
                    }
                }
            });
        }

    }, 200);
}
