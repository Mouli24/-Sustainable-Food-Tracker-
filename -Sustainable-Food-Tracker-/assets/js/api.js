/* ============================================================
   API Module - OpenFoodFacts Interaction
============================================================ */

const BASE_URL = "https://world.openfoodfacts.org";

/**
 * Fetch a single product by barcode
 */
export async function getProductByBarcode(barcode) {
    try {
        const url = `${BASE_URL}/api/v2/product/${barcode}.json`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 1) {
            return data.product;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        return null;
    }
}

/**
 * Search products by name/term
 */
export async function searchProducts(query) {
    try {
        // search_simple=1 -> simple search
        // json=1 -> return JSON
        const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`;
        const res = await fetch(url);
        const data = await res.json();

        return data.products || [];
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
}
