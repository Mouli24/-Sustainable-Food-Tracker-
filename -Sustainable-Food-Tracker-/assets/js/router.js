/* ============================================================
   Router Module - Navigation Logic
============================================================ */

export function initRouter() {
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
        window.scrollTo(0, 0);
    }

    function closeMobileMenu() {
        burger?.classList.remove("active");
        navLinksContainer?.classList.remove("active");
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
    logo?.addEventListener("click", (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove("active"));
        // activate home link if exists
        const homeLink = document.querySelector('.nav-link[data-page="home"]');
        if (homeLink) homeLink.classList.add("active");

        showPage("home");
        closeMobileMenu();
    });

    // mobile menu toggle
    burger?.addEventListener("click", () => {
        burger.classList.toggle("active");
        navLinksContainer.classList.toggle("active");
    });
}
