/* ============================================================
   EcoFood Tracker — Main JavaScript
   Features: Firebase Auth, Navigation, Search, Scanner,
             Dark Mode, Modals, Dashboard Charts, Profile
   ============================================================

   ⚠️ IMPORTANT: Replace the firebaseConfig below with YOUR
   own Firebase project credentials from:
   https://console.firebase.google.com
============================================================ */

const $ = (id) => document.getElementById(id);

/* ============================================================
   FIREBASE CONFIG — REPLACE WITH YOUR OWN
============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyAknB1xieD-EJdR-fxCKPUG_7pWVLdIRfY",
    authDomain: "foodtracker-c939c.firebaseapp.com",
    databaseURL: "https://foodtracker-c939c-default-rtdb.firebaseio.com",
    projectId: "foodtracker-c939c",
    storageBucket: "foodtracker-c939c.firebasestorage.app",
    messagingSenderId: "1032283165005",
    appId: "1:1032283165005:web:70a5b2d93a4ab9729f6704",
    measurementId: "G-0WQX2DS2KV"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();


/* ============================================================
   AUTH STATE OBSERVER
============================================================ */
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        $("auth-wrapper").classList.add("hidden");
        $("app-wrapper").classList.remove("hidden");

        // Set display info
        updateNavAvatar(user);
        $("hero-user-name").textContent = user.displayName?.split(" ")[0] || "User";
        $("profile-display-name").textContent = user.displayName || "User";
        $("profile-email").textContent = user.email || "";
        $("edit-display-name").value = user.displayName || "";

        updateProfileAvatar(user);
        loadTrackerData(user.uid);
    } else {
        // User is signed out
        $("auth-wrapper").classList.remove("hidden");
        $("app-wrapper").classList.add("hidden");
    }
});


/* ============================================================
   AUTH: LOGIN
============================================================ */
$("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    const errorEl = $("login-error");
    const btn = $("login-btn");

    errorEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Signing in...";

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        errorEl.textContent = friendlyAuthError(err.code);
        errorEl.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
});


/* ============================================================
   AUTH: SIGNUP
============================================================ */
$("signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("signup-name").value.trim();
    const email = $("signup-email").value.trim();
    const password = $("signup-password").value;
    const errorEl = $("signup-error");
    const btn = $("signup-btn");

    errorEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // Create user profile document in Firestore
        await db.collection("users").doc(cred.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ecoPoints: 0,
            totalScans: 0
        });

    } catch (err) {
        errorEl.textContent = friendlyAuthError(err.code);
        errorEl.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
});


/* ============================================================
   AUTH: GOOGLE SIGN-IN
============================================================ */
$("google-login-btn")?.addEventListener("click", async () => {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        // If new user, create Firestore profile
        if (result.additionalUserInfo?.isNewUser) {
            await db.collection("users").doc(result.user.uid).set({
                name: result.user.displayName || "",
                email: result.user.email || "",
                photoURL: result.user.photoURL || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ecoPoints: 0,
                totalScans: 0
            });
        }
    } catch (err) {
        const errorEl = $("login-error");
        errorEl.textContent = friendlyAuthError(err.code);
        errorEl.classList.remove("hidden");
    }
});


/* ============================================================
   AUTH: SWITCH FORMS & LOGOUT
============================================================ */
$("show-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    $("auth-login").classList.remove("active");
    $("auth-signup").classList.add("active");
});
$("show-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    $("auth-signup").classList.remove("active");
    $("auth-login").classList.add("active");
});
$("logout-btn")?.addEventListener("click", () => {
    auth.signOut();
});


/* ============================================================
   PROFILE MANAGEMENT
============================================================ */
function updateNavAvatar(user) {
    const avatarImg = $("nav-avatar-img");
    const avatarInitial = $("nav-avatar-initial");

    if (user.photoURL) {
        avatarImg.src = user.photoURL;
        avatarImg.style.display = "block";
        avatarInitial.style.display = "none";
    } else {
        avatarImg.style.display = "none";
        avatarInitial.style.display = "flex";
        avatarInitial.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
    }
}

function updateProfileAvatar(user) {
    const img = $("profile-avatar");
    const initial = $("profile-avatar-initial");

    if (user.photoURL) {
        img.src = user.photoURL;
        img.style.display = "block";
        initial.style.display = "none";
    } else {
        img.style.display = "none";
        initial.style.display = "flex";
        initial.textContent = (user.displayName || user.email || "U")[0].toUpperCase();
    }
}

// Save display name
$("save-profile-btn")?.addEventListener("click", async () => {
    const newName = $("edit-display-name").value.trim();
    if (!newName) return;

    const btn = $("save-profile-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        const user = auth.currentUser;
        await user.updateProfile({ displayName: newName });
        await db.collection("users").doc(user.uid).update({ name: newName });

        $("profile-display-name").textContent = newName;
        $("hero-user-name").textContent = newName.split(" ")[0];
        updateNavAvatar(user);

        btn.textContent = "Saved!";
        setTimeout(() => { btn.textContent = "Save Changes"; btn.disabled = false; }, 1500);
    } catch (err) {
        btn.textContent = "Error - try again";
        setTimeout(() => { btn.textContent = "Save Changes"; btn.disabled = false; }, 1500);
    }
});

// Avatar upload
$("avatar-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;

    // Show loading state
    const initial = $("profile-avatar-initial");
    if (initial) initial.textContent = "...";

    try {
        // Upload to Firebase Storage
        const ref = storage.ref(`avatars/${user.uid}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();

        // Update auth profile and Firestore
        await user.updateProfile({ photoURL: url });
        await db.collection("users").doc(user.uid).update({ photoURL: url });

        // Refresh UI
        updateProfileAvatar(auth.currentUser);
        updateNavAvatar(auth.currentUser);
    } catch (err) {
        showError("Failed to upload photo. Please try again.");
    }

    e.target.value = "";
});

// Navigate to profile from nav avatar
$("nav-avatar")?.addEventListener("click", () => {
    showPage("profile");
});

function friendlyAuthError(code) {
    const map = {
        "auth/email-already-in-use": "This email is already registered. Try signing in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/popup-closed-by-user": "Sign-in was cancelled.",
        "auth/invalid-credential": "Invalid credentials. Please check and try again."
    };
    return map[code] || "Something went wrong. Please try again.";
}


/* ============================================================
   NAVIGATION
============================================================ */
const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");
const burger = $("burger");
const navLinksContainer = $("nav-links");

function showPage(name) {
    pages.forEach(p => {
        if (p.id === `page-${name}`) p.classList.add("active");
        else p.classList.remove("active");
    });
    navLinks.forEach(l => {
        if (l.dataset.page === name) l.classList.add("active");
        else l.classList.remove("active");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "dashboard") renderDashboard();
}

navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) showPage(page);
        closeMobileMenu();
    });
});

document.querySelectorAll(".logo").forEach(logo => {
    logo.addEventListener("click", (e) => {
        e.preventDefault();
        showPage("home");
        closeMobileMenu();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".footer-nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) showPage(page);
        });
    });
});

burger?.addEventListener("click", () => {
    burger.classList.toggle("active");
    navLinksContainer?.classList.toggle("active");
});

function closeMobileMenu() {
    burger?.classList.remove("active");
    navLinksContainer?.classList.remove("active");
}


/* ============================================================
   INITIALIZATION
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    initSearch();
    initModals();
    initScanners();
    initSettings();
    initChips();
    initLearnMore();
});


/* ============================================================
   TRACKER DATA (Firestore-backed)
============================================================ */
let trackerData = {
    totalScans: 0,
    productsFound: 0,
    healthyChoices: 0,
    ecoPoints: 0,
    weeklyScans: [0, 0, 0, 0, 0, 0, 0],
    recentActivity: []
};

async function loadTrackerData(uid) {
    try {
        const doc = await db.collection("trackerData").doc(uid).get();
        if (doc.exists) {
            trackerData = { ...trackerData, ...doc.data() };
        }
    } catch (e) { /* ignore */ }
}

async function saveTrackerData() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await db.collection("trackerData").doc(user.uid).set(trackerData);
    } catch (e) { /* ignore */ }
}

function trackScan() {
    trackerData.totalScans++;
    trackerData.ecoPoints += 5;
    const dayIndex = (new Date().getDay() + 6) % 7;
    trackerData.weeklyScans[dayIndex]++;
    saveTrackerData();
}

function trackProductFound(product) {
    trackerData.productsFound++;
    trackerData.ecoPoints += 10;
    const nutriGrade = product.nutriscore_grade?.toLowerCase();
    if (nutriGrade === "a" || nutriGrade === "b") {
        trackerData.healthyChoices++;
        trackerData.ecoPoints += 15;
    }
    trackerData.recentActivity.unshift({
        name: product.product_name || "Unknown",
        brand: product.brands || "",
        score: nutriGrade?.toUpperCase() || "?",
        time: new Date().toLocaleString()
    });
    if (trackerData.recentActivity.length > 10) {
        trackerData.recentActivity = trackerData.recentActivity.slice(0, 10);
    }
    saveTrackerData();
}


/* ============================================================
   DASHBOARD RENDERING
============================================================ */
let ecoPointsChartInstance = null;
let weeklyChartInstance = null;

function renderDashboard() {
    const pts = trackerData.ecoPoints;
    $("total-eco-points").textContent = pts.toLocaleString();

    const level = Math.floor(pts / 100) + 1;
    const pct = pts % 100;
    $("eco-points-percentage").textContent = pct + "%";
    const levelSpan = $("eco-points-percentage")?.nextElementSibling;
    if (levelSpan) levelSpan.textContent = `to Level ${level + 1}`;

    $("stat-total-scans").textContent = trackerData.totalScans;
    $("stat-products-found").textContent = trackerData.productsFound;
    $("stat-healthy").textContent = trackerData.healthyChoices;

    const scanProg = $("impact-scans");
    if (scanProg) scanProg.value = Math.min(trackerData.totalScans, 100);
    const prodProg = $("impact-products");
    if (prodProg) prodProg.value = Math.min(trackerData.productsFound, 100);
    const healthProg = $("impact-healthy");
    if (healthProg) healthProg.value = Math.min(trackerData.healthyChoices, 100);

    const actEl = $("recent-activity");
    if (actEl) {
        if (trackerData.recentActivity.length === 0) {
            actEl.innerHTML = '<p class="empty-state">No scans yet. Start scanning to see your activity!</p>';
        } else {
            actEl.innerHTML = trackerData.recentActivity.map(a => `
                <div class="activity-item">
                    <div class="activity-item-info">
                        <strong>${a.name}</strong>
                        <span>${a.brand} · ${a.time}</span>
                    </div>
                    <span class="grade-badge grade-${a.score.toLowerCase()}">${a.score}</span>
                </div>
            `).join("");
        }
    }

    renderEcoPointsChart(pct);
    renderWeeklyChart();
}

function renderEcoPointsChart(pct) {
    const canvas = $("ecoPointsChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (ecoPointsChartInstance) ecoPointsChartInstance.destroy();
    ecoPointsChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            datasets: [{
                data: [pct, 100 - pct],
                backgroundColor: ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.2)"],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "78%",
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            animation: { animateRotate: true, duration: 800 }
        }
    });
}

function renderWeeklyChart() {
    const canvas = $("weeklyProgressChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    const isDark = document.documentElement.classList.contains("dark-mode");
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    weeklyChartInstance = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
                label: "Scans",
                data: trackerData.weeklyScans,
                backgroundColor: "rgba(45, 138, 110, 0.7)",
                borderColor: "rgba(45, 138, 110, 1)",
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1, precision: 0 }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}


/* ============================================================
   SEARCH & API
============================================================ */
async function handleSearch(query) {
    if (!query || !query.trim()) return;
    query = query.trim();
    trackScan();
    const isBarcode = /^\d{8,14}$/.test(query);
    if (isBarcode) await fetchProductByBarcode(query);
    else await fetchProductsByText(query);
}

async function fetchProductByBarcode(barcode) {
    showLoading("Searching for product...");
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const data = await res.json();
        if (data.status === 0 || !data.product) {
            showError("Product not found. Please try another barcode.");
            return;
        }
        trackProductFound(data.product);
        displayProductModal(data.product);
    } catch (e) {
        showError("Error fetching product data. Please check your connection.");
    }
}

async function fetchProductsByText(text) {
    showLoading(`Searching for "${text}"...`);
    try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(text)}&search_simple=1&action=process&json=1&page_size=24`);
        const data = await res.json();
        if (!data.products || data.products.length === 0) {
            showError(`No products found for "${text}".`);
            return;
        }
        displaySearchResults(data.products);
    } catch (e) {
        showError("Error searching for products. Please check your connection.");
    }
}


/* ============================================================
   UI & DISPLAY
============================================================ */
function showLoading(msg) {
    openModal(`<div class="modal-loading"><div class="loader"></div><h3>${msg}</h3></div>`);
}

function showError(msg) {
    openModal(`
        <div class="modal-message">
            <div class="modal-message-icon error"></div>
            <h3>Oops!</h3>
            <p>${msg}</p>
            <button class="btn btn-primary" onclick="closeModal()">Close</button>
        </div>
    `);
}

function displayProductModal(p) {
    const name = p.product_name || "Unknown Product";
    const brand = p.brands || "Unknown Brand";
    const quantity = p.quantity || "N/A";
    const image = p.image_front_small_url || p.image_url || "";
    const nutriScore = p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : "?";
    const ecoScore = p.ecoscore_grade ? p.ecoscore_grade.toUpperCase() : "?";
    const nutriClass = p.nutriscore_grade ? `score-${p.nutriscore_grade}` : "";
    const co2 = p.ecoscore_data?.agribalyse?.co2_total;
    const co2Text = typeof co2 === "number" ? co2.toFixed(2) + " kg CO2e" : "Unknown";
    const categories = p.categories_tags?.slice(0, 3).map(c => c.replace("en:", "").replace(/-/g, " ")).join(", ") || "N/A";

    const imgHTML = image
        ? `<img src="${image}" alt="${name}" class="product-image-large">`
        : `<div class="product-image-placeholder">No Image</div>`;

    openModal(`
        <div class="product-modal-content">
            <div class="product-header">
                ${imgHTML}
                <div class="product-info-header">
                    <span class="product-brand">${brand}</span>
                    <h2 class="product-title">${name}</h2>
                    <span class="product-quantity">${quantity}</span>
                </div>
            </div>
            <div class="product-scores">
                <div class="score-card nutri-score ${nutriClass}">
                    <span class="score-label">Nutri-Score</span>
                    <span class="score-value">${nutriScore}</span>
                </div>
                <div class="score-card eco-score">
                    <span class="score-label">Eco-Score</span>
                    <span class="score-value">${ecoScore}</span>
                </div>
            </div>
            <div class="product-details-grid">
                <div class="detail-item"><strong>CO2 Impact</strong><span>${co2Text}</span></div>
                <div class="detail-item"><strong>Categories</strong><span>${categories}</span></div>
                <div class="detail-item"><strong>Ingredients</strong><span>${p.ingredients_text ? "Available" : "Not listed"}</span></div>
                <div class="detail-item"><strong>Allergens</strong><span>${p.allergens_tags?.length ? p.allergens_tags.map(a => a.replace("en:", "")).join(", ") : "None listed"}</span></div>
            </div>
        </div>
    `);
}

function displaySearchResults(products) {
    const container = $("search-results-container");
    const cards = products.map(p => {
        const image = p.image_small_url || p.image_url || "";
        const imgHTML = image
            ? `<img src="${image}" alt="${p.product_name || 'Product'}" loading="lazy">`
            : `<div class="product-card-placeholder">No Image</div>`;
        return `
            <div class="product-card" onclick="fetchProductByBarcode('${p.code}')">
                ${imgHTML}
                <div class="product-card-body">
                    <h4>${p.product_name || "Unknown Product"}</h4>
                    <p>${p.brands || ""}</p>
                </div>
            </div>
        `;
    }).join("");
    showPage("search");
    if (container) {
        container.innerHTML = `<div class="results-grid">${cards}</div>`;
        container.scrollIntoView({ behavior: "smooth" });
    }
    closeModal();
}


/* ============================================================
   EVENT LISTENERS
============================================================ */
function initSearch() {
    $("hero-search-input")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") { e.preventDefault(); handleSearch(e.target.value); }
    });
    $("main-search-input")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") { e.preventDefault(); handleSearch(e.target.value); }
    });
}

function initChips() {
    document.querySelectorAll(".chip[data-query]").forEach(chip => {
        chip.addEventListener("click", () => handleSearch(chip.dataset.query));
    });
}
function initLearnMore() {
    $("hero-learn-more")?.addEventListener("click", () => showPage("about"));
}
function initModals() {
    $("modal-overlay")?.addEventListener("click", closeModal);
    $("modal-close-btn")?.addEventListener("click", closeModal);
}


/* ============================================================
   MODAL HELPERS
============================================================ */
function openModal(html) {
    const container = $("modal-container");
    const overlay = $("modal-overlay");
    const content = $("modal-content");
    if (container && overlay && content) {
        content.innerHTML = html;
        container.classList.remove("hidden");
        overlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }
}

function closeModal() {
    $("modal-container")?.classList.add("hidden");
    $("modal-overlay")?.classList.add("hidden");
    document.body.style.overflow = "";
}


/* ============================================================
   SCANNERS
============================================================ */
let html5QrCode = null;

function initScanners() {
    // Manual barcode entry
    const barcodeBtn = $("action-enter-barcode");
    const barcodeModal = $("barcode-modal");
    const barcodeOverlay = $("barcode-overlay");
    const barcodeInput = $("barcode-input");

    if (barcodeBtn && barcodeModal) {
        barcodeBtn.addEventListener("click", () => {
            barcodeModal.classList.remove("hidden");
            barcodeOverlay?.classList.remove("hidden");
            setTimeout(() => barcodeInput?.focus(), 100);
        });

        const triggerManualSearch = () => {
            const val = barcodeInput?.value?.trim();
            if (val) {
                barcodeModal.classList.add("hidden");
                barcodeOverlay?.classList.add("hidden");
                if (barcodeInput) barcodeInput.value = "";
                handleSearch(val);
            }
        };

        $("barcode-search-btn")?.addEventListener("click", triggerManualSearch);
        barcodeInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") triggerManualSearch();
        });

        const closeManual = () => {
            barcodeModal.classList.add("hidden");
            barcodeOverlay?.classList.add("hidden");
        };
        $("barcode-close-btn")?.addEventListener("click", closeManual);
        barcodeOverlay?.addEventListener("click", closeManual);
    }

    // Camera scan
    [$("hero-start-scanning"), $("action-scan-barcode")].forEach(btn => {
        btn?.addEventListener("click", startLiveScanner);
    });

    // Image upload
    $("action-upload-image")?.addEventListener("click", () => $("image-upload-input")?.click());
    $("image-upload-input")?.addEventListener("change", handleImageUpload);
}

function startLiveScanner() {
    $("scanner-modal")?.classList.remove("hidden");
    $("scanner-overlay")?.classList.remove("hidden");

    if (typeof Html5Qrcode === "undefined") {
        showError("Scanner library failed to load. Please refresh the page.");
        stopLiveScanner();
        return;
    }
    if (!html5QrCode) html5QrCode = new Html5Qrcode("scanner-view");

    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.QR_CODE
            ]
        },
        (decoded) => { stopLiveScanner(); handleSearch(decoded); },
        () => {}
    ).then(() => {
        const s = $("scanner-status");
        if (s) s.textContent = "Camera active — point at a barcode";
    }).catch(() => {
        showError("Could not start camera. Please allow camera permissions.");
        stopLiveScanner();
    });

    $("scanner-close-btn")?.addEventListener("click", stopLiveScanner, { once: true });
    $("scanner-overlay")?.addEventListener("click", stopLiveScanner, { once: true });
}

function stopLiveScanner() {
    const hide = () => {
        $("scanner-modal")?.classList.add("hidden");
        $("scanner-overlay")?.classList.add("hidden");
    };
    if (html5QrCode?.isScanning) html5QrCode.stop().then(hide).catch(hide);
    else hide();
}

function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (typeof Quagga === "undefined") {
        showError("Image scanner library failed to load.");
        return;
    }
    showLoading("Scanning image for barcode...");
    const reader = new FileReader();
    reader.onload = (event) => {
        Quagga.decodeSingle({
            src: event.target.result,
            numOfWorkers: 0,
            decoder: { readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader"] },
            locate: true
        }, (result) => {
            if (result?.codeResult) handleSearch(result.codeResult.code);
            else showError("No barcode detected. Please try a clearer photo.");
        });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
}


/* ============================================================
   SETTINGS
============================================================ */
function initSettings() {
    const darkToggle = $("toggle-dark-mode");
    const textToggle = $("toggle-large-text");

    if (localStorage.getItem("darkMode") === "true") {
        document.documentElement.classList.add("dark-mode");
        if (darkToggle) darkToggle.checked = true;
    }
    if (localStorage.getItem("largeText") === "true") {
        document.documentElement.classList.add("large-text");
        if (textToggle) textToggle.checked = true;
    }

    darkToggle?.addEventListener("change", () => {
        document.documentElement.classList.toggle("dark-mode", darkToggle.checked);
        localStorage.setItem("darkMode", darkToggle.checked);
    });
    textToggle?.addEventListener("change", () => {
        document.documentElement.classList.toggle("large-text", textToggle.checked);
        localStorage.setItem("largeText", textToggle.checked);
    });
}
