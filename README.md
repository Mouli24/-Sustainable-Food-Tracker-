# EcoFood Tracker

A sustainable food tracking web app that helps you make healthier, eco-friendly food choices. Scan barcodes, search products, and track your environmental impact — all powered by [OpenFoodFacts](https://world.openfoodfacts.org/).

## Features

- **User Authentication** — Sign up / sign in with email or Google (Firebase Auth)
- **Product Search** — Search by product name, brand, or barcode number
- **Barcode Scanner** — Live camera scanning, image upload, or manual entry
- **Nutritional Info** — Nutri-Score, Eco-Score, CO₂ impact, allergens, ingredients
- **Eco-Points Dashboard** — Track your scans, healthy choices, and weekly progress with interactive charts
- **Profile Management** — Profile photo upload, display name editing, dark mode, large text
- **Privacy First** — Your data is stored in your Firebase project; nothing is shared

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Frontend        | HTML, CSS, JavaScript (vanilla)   |
| Auth & Database | Firebase Auth, Cloud Firestore    |
| Storage         | Firebase Storage (profile photos) |
| Charts          | Chart.js                          |
| Scanning        | html5-qrcode, QuaggaJS            |
| Food Data       | OpenFoodFacts API                 |

## Getting Started

### Prerequisites

- A [Firebase](https://firebase.google.com/) project (free tier is sufficient)
- A local web server (Live Server extension for VS Code is recommended)

### Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project
2. Enable **Authentication** → Sign-in method → turn on **Email/Password** and **Google**
3. Enable **Cloud Firestore** → Create database → Start in test mode
4. Enable **Storage** → Get started → Start in test mode
5. Go to **Project Settings** → Your apps → Click the web icon (`</>`) → Register app
6. Copy the `firebaseConfig` object and paste it into `index.js` (lines 18–27)

### Running Locally

**Option 1: VS Code Live Server (Recommended)**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → **Open with Live Server**

**Option 2: npx serve**

```bash
npx serve
```

Then open `http://localhost:3000`

**Option 3: Python**

```bash
python -m http.server
```

Then open `http://localhost:8000`

## Project Structure

```
├── index.html    # Main HTML (auth screens, app pages, modals)
├── index.js      # App logic (Firebase auth, search, scanner, dashboard)
├── index.css     # Styles (auth, nav, cards, charts, dark mode, responsive)
└── README.md
```

## Screenshots

| Login                                   | Dashboard                                       | Product Search                         |
| --------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| Auth screen with email & Google sign-in | Eco-Points chart, weekly scans, recent activity | Search results grid with product cards |

## API

This app uses the [OpenFoodFacts API](https://wiki.openfoodfacts.org/API) — a free, open database of food products from around the world maintained by volunteers.

## License

This project is open source and available under the [MIT License](LICENSE).
