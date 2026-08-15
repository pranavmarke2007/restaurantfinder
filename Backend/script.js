const locationForm = document.getElementById("locationForm");
const locationInput = document.getElementById("locationInput");
const locationAutocomplete = document.getElementById("locationAutocomplete");
const currentLocationButton = document.getElementById("currentLocationButton");
const appShell = document.getElementById("appShell");
const authStatus = document.getElementById("authStatus");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const authDialog = document.getElementById("authDialog");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authError = document.getElementById("authError");
const showSignInButton = document.getElementById("showSignInButton");
const showSignUpButton = document.getElementById("showSignUpButton");
const authNameLabel = document.getElementById("authNameLabel");
const authNameInput = document.getElementById("authNameInput");
const authEmailInput = document.getElementById("authEmailInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const authSubmitButton = document.getElementById("authSubmitButton");
const preferencesButton = document.getElementById("preferencesButton");
const hybridButton = document.getElementById("hybridButton");
const bestMatchesButton = document.getElementById("bestMatchesButton");
const closestButton = document.getElementById("closestButton");
const exportPreferencesButton = document.getElementById("exportPreferencesButton");
const importPreferencesInput = document.getElementById("importPreferencesInput");
const preferencesDialog = document.getElementById("preferencesDialog");
const preferencesForm = document.getElementById("preferencesForm");
const skipPreferencesButton = document.getElementById("skipPreferencesButton");
const clearPreferencesButton = document.getElementById("clearPreferencesButton");
const tasteProfileInput = document.getElementById("tasteProfileInput");
const tasteSignatureText = document.getElementById("tasteSignatureText");
const favoriteRestaurantsSummary = document.getElementById("favoriteRestaurantsSummary");
const favoriteCuisinesSummary = document.getElementById("favoriteCuisinesSummary");
const favoriteDishesSummary = document.getElementById("favoriteDishesSummary");
const savedRestaurantsSummary = document.getElementById("savedRestaurantsSummary");
const statusText = document.getElementById("status");
const locationOptions = document.getElementById("locationOptions");
const restaurantsList = document.getElementById("restaurants");
const pagination = document.getElementById("pagination");

const restaurantsPerPage = 10;
const authTokenStorageKey = "restaurantFinderAuthToken";
const apiBaseUrl = window.location.protocol === "file:" || window.location.port === "5500"
    ? "http://localhost:5501"
    : "";

// Preference options with icons
const preferenceOptions = {
    cuisines: [
        { name: "Indian", icon: "🇮🇳" },
        { name: "Italian", icon: "🇮🇹" },
        { name: "Chinese", icon: "🥡" },
        { name: "Mexican", icon: "🌮" },
        { name: "Japanese", icon: "🍱" },
        { name: "Thai", icon: "🍜" },
        { name: "Continental", icon: "🍽️" },
        { name: "Mediterranean", icon: "🫒" },
        { name: "Korean", icon: "🍚" },
        { name: "Vietnamese", icon: "🍲" },
        { name: "Middle Eastern", icon: "🥙" },
        { name: "Fast Food", icon: "🍔" }
    ],
    dishes: [
        { name: "Biryani", icon: "🍚" },
        { name: "Pizza", icon: "🍕" },
        { name: "Burger", icon: "🍔" },
        { name: "Pasta", icon: "🍝" },
        { name: "Sushi", icon: "🍣" },
        { name: "Tacos", icon: "🌮" },
        { name: "Dosa", icon: "🥘" },
        { name: "Noodles", icon: "🍜" },
        { name: "Kebab", icon: "🍢" },
        { name: "Samosa", icon: "🥟" },
        { name: "Steak", icon: "🥩" },
        { name: "Seafood", icon: "🦞" }
    ],
    dietary: [
        { name: "Vegetarian", icon: "🥗" },
        { name: "Vegan", icon: "🌱" },
        { name: "Gluten-free", icon: "🌾" },
        { name: "Halal", icon: "☪️" },
        { name: "Kosher", icon: "✡️" },
        { name: "Non-Veg", icon: "🍖" },
        { name: "Pescatarian", icon: "🐟" },
        { name: "Jain", icon: "✨" }
    ],
    mealType: [
        { name: "Breakfast", icon: "🍳" },
        { name: "Lunch", icon: "🍲" },
        { name: "Dinner", icon: "🍽️" },
        { name: "Brunch", icon: "🥐" },
        { name: "Desserts", icon: "🍰" },
        { name: "Coffee", icon: "☕" },
        { name: "Snacks", icon: "🥨" },
        { name: "Late Night", icon: "🌙" }
    ],
    atmosphere: [
        { name: "Casual", icon: "👕" },
        { name: "Fine Dining", icon: "🎩" },
        { name: "Family-friendly", icon: "👨‍👩‍👧‍👦" },
        { name: "Romantic", icon: "💕" },
        { name: "Trendy", icon: "✨" },
        { name: "Quiet", icon: "🤫" },
        { name: "Lively", icon: "🎉" },
        { name: "Cozy", icon: "🕯️" }
    ],
    budget: [
        { name: "Budget", icon: "💰" },
        { name: "Moderate", icon: "💵" },
        { name: "Premium", icon: "💎" },
        { name: "Luxury", icon: "👑" }
    ],
    features: [
        { name: "Outdoor Seating", icon: "🌳" },
        { name: "Live Music", icon: "🎵" },
        { name: "WiFi", icon: "📶" },
        { name: "Parking", icon: "🅿️" },
        { name: "Pet-friendly", icon: "🐕" },
        { name: "Delivery", icon: "🚚" },
        { name: "Takeaway", icon: "📦" },
        { name: "Reservations", icon: "📋" }
    ]
};

const sortModes = {
    best: "best",
    closest: "closest",
    hybrid: "hybrid"
};

let authMode = "signIn";
let currentUser = null;
let userPreferences = createDefaultPreferences();
let restaurants = [];
let currentPage = 1;
let sortMode = sortModes.hybrid;
let lastSearchPoint = null;
let lastSearchLabel = "";
const imageCache = new Map();

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem(authTokenStorageKey);
    const response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error("Backend API is not responding with JSON. Open the app at http://localhost:5501 or run npm start.");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

async function createUser(name, email, password) {
    return apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });
}

async function authenticateUser(email, password) {
    return apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

async function loadCurrentUser() {
    if (!localStorage.getItem(authTokenStorageKey)) {
        return null;
    }

    const data = await apiRequest("/api/me");
    return data.user;
}

function setSignedInUser(user, token) {
    currentUser = user;

    if (token) {
        localStorage.setItem(authTokenStorageKey, token);
    }

    userPreferences = loadPreferences();
    updateAuthUi();
    updatePreferenceSummary();
}

async function signOut() {
    try {
        await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    currentUser = null;
    userPreferences = createDefaultPreferences();
    restaurants = [];
    currentPage = 1;
    lastSearchPoint = null;
    localStorage.removeItem(authTokenStorageKey);
    restaurantsList.innerHTML = "";
    pagination.innerHTML = "";
    updateAuthUi();
    openAuthDialog("signIn");
}

function createDefaultPreferences() {
    return {
        favoriteRestaurants: [],
        favoriteCuisines: [],
        favoriteDishes: [],
        dietaryPreferences: [],
        mealType: [],
        atmosphere: [],
        budget: [],
        features: [],
        tasteProfile: "",
        tasteSignature: "",
        savedRestaurants: []
    };
}

function normalizePreferenceItem(item) {
    if (typeof item === "string") {
        return { name: item.trim(), weight: 3 };
    }

    return {
        name: String(item.name || "").trim(),
        weight: Number(item.weight) || 3
    };
}

function cleanPreferenceList(items) {
    return (items || [])
        .map(normalizePreferenceItem)
        .filter((item) => item.name.length > 0)
        .map((item) => ({
            name: item.name,
            weight: Math.min(Math.max(item.weight, 1), 5)
        }));
}

function generateTasteSignature(preferences) {
    const parts = [
        ...preferences.favoriteCuisines.map((item) => item.name),
        ...preferences.favoriteDishes.map((item) => item.name),
        ...preferences.favoriteRestaurants.map((item) => item.name),
        ...preferences.dietaryPreferences.map((item) => item.name),
        ...preferences.mealType.map((item) => item.name),
        ...preferences.atmosphere.map((item) => item.name),
        ...preferences.budget.map((item) => item.name),
        ...preferences.features.map((item) => item.name),
        preferences.tasteProfile
    ].filter(Boolean);

    return parts.join(" ").toLowerCase();
}

function normalizePreferences(preferences) {
    const normalized = {
        ...createDefaultPreferences(),
        ...preferences,
        favoriteRestaurants: cleanPreferenceList(preferences.favoriteRestaurants),
        favoriteCuisines: cleanPreferenceList(preferences.favoriteCuisines),
        favoriteDishes: cleanPreferenceList(preferences.favoriteDishes),
        dietaryPreferences: cleanPreferenceList(preferences.dietaryPreferences),
        mealType: cleanPreferenceList(preferences.mealType),
        atmosphere: cleanPreferenceList(preferences.atmosphere),
        budget: cleanPreferenceList(preferences.budget),
        features: cleanPreferenceList(preferences.features),
        tasteProfile: String(preferences.tasteProfile || "").trim(),
        savedRestaurants: preferences.savedRestaurants || []
    };

    normalized.tasteSignature = generateTasteSignature(normalized);
    return normalized;
}

function loadPreferences() {
    if (!currentUser) {
        return createDefaultPreferences();
    }

    return normalizePreferences(currentUser.preferences || createDefaultPreferences());
}

async function savePreferences(options = {}) {
    if (!currentUser) {
        return;
    }

    userPreferences = normalizePreferences(userPreferences);
    const data = await apiRequest("/api/preferences", {
        method: "PUT",
        body: JSON.stringify({
            preferences: userPreferences,
            ...options
        })
    });
    currentUser = data.user;
}

function parsePreferenceTextarea(value, weight) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((name) => ({ name, weight: Number(weight) || 3 }));
}

function fillPreferencesForm() {
    // Render preference cards
    renderPreferenceCards("cuisines", userPreferences.favoriteCuisines);
    renderPreferenceCards("dishes", userPreferences.favoriteDishes);
    renderPreferenceCards("dietary", userPreferences.dietaryPreferences);
    renderPreferenceCards("mealType", userPreferences.mealType);
    renderPreferenceCards("atmosphere", userPreferences.atmosphere);
    renderPreferenceCards("budget", userPreferences.budget);
    renderPreferenceCards("features", userPreferences.features);
    tasteProfileInput.value = userPreferences.tasteProfile;
}

function renderPreferenceCards(category, selectedItems) {
    const containerId = `${category}Cards`;
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    const options = preferenceOptions[category] || [];
    const selectedNames = new Set(selectedItems.map((item) => item.name));

    options.forEach((option) => {
        const card = document.createElement("div");
        card.className = `preference-card ${selectedNames.has(option.name) ? "selected" : ""}`;
        card.innerHTML = `
            <span class="preference-card-icon">${option.icon}</span>
            <span class="preference-card-label">${option.name}</span>
            <span class="checkmark">✓</span>
        `;

        card.addEventListener("click", () => {
            card.classList.toggle("selected");
            updatePreferenceFromCards(category);
        });

        container.appendChild(card);
    });
}

function updatePreferenceFromCards(category) {
    const containerId = `${category}Cards`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedCards = container.querySelectorAll(".preference-card.selected");
    const selectedNames = Array.from(selectedCards).map((card) => {
        return card.querySelector(".preference-card-label").textContent.trim();
    });

    // Map to preference weight (all cards get weight 4 as default)
    const preferenceArray = selectedNames.map((name) => ({ name, weight: 4 }));

    // Update user preferences
    if (category === "cuisines") {
        userPreferences.favoriteCuisines = preferenceArray;
    } else if (category === "dishes") {
        userPreferences.favoriteDishes = preferenceArray;
    } else if (category === "dietary") {
        userPreferences.dietaryPreferences = preferenceArray;
    } else if (category === "mealType") {
        userPreferences.mealType = preferenceArray;
    } else if (category === "atmosphere") {
        userPreferences.atmosphere = preferenceArray;
    } else if (category === "budget") {
        userPreferences.budget = preferenceArray;
    } else if (category === "features") {
        userPreferences.features = preferenceArray;
    }
}

function summarizePreferenceList(items, category = null) {
    if (items.length === 0) {
        return "None yet";
    }

    const itemsToShow = items.slice(0, 3);
    const displayItems = itemsToShow.map((item) => {
        // Try to find emoji from preference options
        let emoji = "";
        if (category) {
            const options = preferenceOptions[category] || [];
            const found = options.find((opt) => opt.name === item.name);
            if (found) emoji = found.icon + " ";
        }
        return emoji + item.name;
    }).join(" • ");

    return displayItems + (items.length > 3 ? ` +${items.length - 3} more` : "");
}

function updatePreferenceSummary() {
    favoriteCuisinesSummary.textContent = summarizePreferenceList(userPreferences.favoriteCuisines, "cuisines");
    favoriteDishesSummary.textContent = summarizePreferenceList(userPreferences.favoriteDishes, "dishes");
    favoriteRestaurantsSummary.textContent = summarizePreferenceList(userPreferences.favoriteRestaurants);
    savedRestaurantsSummary.textContent = `${userPreferences.savedRestaurants.length} restaurants`;
    tasteSignatureText.textContent = userPreferences.tasteSignature
        ? `Taste signature: ${userPreferences.tasteSignature}`
        : "Set your taste preferences to improve recommendations.";
}

async function readPreferencesForm() {
    // Read from all preference categories
    updatePreferenceFromCards("cuisines");
    updatePreferenceFromCards("dishes");
    updatePreferenceFromCards("dietary");
    updatePreferenceFromCards("mealType");
    updatePreferenceFromCards("atmosphere");
    updatePreferenceFromCards("budget");
    updatePreferenceFromCards("features");

    userPreferences.tasteProfile = tasteProfileInput.value.trim();
    await savePreferences();
    updatePreferenceSummary();
}

function showMessage(message) {
    statusText.textContent = message;
}

function normalizeText(text) {
    return String(text || "").toLowerCase();
}

function getRestaurantName(restaurant) {
    return restaurant.tags?.name || "Unnamed restaurant";
}

function getRestaurantCuisine(restaurant) {
    const cuisine = restaurant.tags?.cuisine || restaurant.tags?.["diet:vegetarian"] || "";
    return String(cuisine).replaceAll(";", ", ");
}

function getRestaurantText(restaurant) {
    const tags = restaurant.tags || {};
    return [
        tags.name,
        tags.cuisine,
        tags.description,
        tags.operator,
        tags.brand,
        tags["addr:street"],
        tags["addr:city"]
    ].filter(Boolean).join(" ");
}

function scorePreferenceList(restaurantText, preferenceList, maxScore, label) {
    const reasons = [];
    const totalWeight = preferenceList.reduce((sum, item) => sum + item.weight, 0);

    if (totalWeight === 0) {
        return { score: 0, reasons };
    }

    const matchedWeight = preferenceList.reduce((sum, item) => {
        if (restaurantText.includes(normalizeText(item.name))) {
            reasons.push(`${label}: ${item.name}`);
            return sum + item.weight;
        }

        return sum;
    }, 0);

    return {
        score: Math.round((matchedWeight / totalWeight) * maxScore),
        reasons
    };
}

function calculateTextSimilarity(sourceText, targetText) {
    const sourceWords = new Set(normalizeText(sourceText).split(/\W+/).filter((word) => word.length > 2));
    const targetWords = new Set(normalizeText(targetText).split(/\W+/).filter((word) => word.length > 2));

    if (sourceWords.size === 0 || targetWords.size === 0) {
        return 0;
    }

    let matches = 0;
    targetWords.forEach((word) => {
        if (sourceWords.has(word)) {
            matches++;
        }
    });

    return matches / targetWords.size;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some((value) => Number.isNaN(Number(value)))) {
        return Number.POSITIVE_INFINITY;
    }

    const earthRadiusKm = 6371;
    const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
    const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
    const startLat = Number(lat1) * Math.PI / 180;
    const endLat = Number(lat2) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLon / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateRestaurantScore(restaurant, preferences) {
    const restaurantText = normalizeText(getRestaurantText(restaurant));
    const cuisineScore = scorePreferenceList(
        restaurantText,
        preferences.favoriteCuisines,
        40,
        "Cuisine match"
    );
    const dishScore = scorePreferenceList(
        restaurantText,
        preferences.favoriteDishes,
        30,
        "Dish match"
    );
    const restaurantScore = scorePreferenceList(
        restaurantText,
        preferences.favoriteRestaurants,
        20,
        "Similar to favorite"
    );
    const semanticValue = calculateTextSimilarity(restaurantText, preferences.tasteSignature);
    const semanticScore = Math.round(semanticValue * 10);
    const reasons = [
        ...cuisineScore.reasons,
        ...dishScore.reasons,
        ...restaurantScore.reasons
    ];

    if (semanticScore > 0) {
        reasons.push("Matches your taste profile");
    }

    const score = Math.min(
        100,
        cuisineScore.score + dishScore.score + restaurantScore.score + semanticScore
    );

    return {
        score,
        reasons: reasons.length ? reasons : ["New discovery outside your saved preferences"]
    };
}

function getRestaurantCoordinates(restaurant) {
    return {
        lat: restaurant.lat || restaurant.center?.lat,
        lon: restaurant.lon || restaurant.center?.lon
    };
}

function enhanceRestaurants(results, searchPoint) {
    return results.map((restaurant) => {
        const coordinates = getRestaurantCoordinates(restaurant);
        const match = calculateRestaurantScore(restaurant, userPreferences);

        return {
            ...restaurant,
            name: getRestaurantName(restaurant),
            cuisine: getRestaurantCuisine(restaurant),
            address: getRestaurantAddress(restaurant.tags || {}),
            matchScore: match.score,
            matchReasons: match.reasons,
            distance: calculateDistanceKm(searchPoint.lat, searchPoint.lon, coordinates.lat, coordinates.lon)
        };
    });
}

function sortRestaurants() {
    restaurants.sort((a, b) => {
        if (sortMode === sortModes.closest) {
            return a.distance - b.distance || b.matchScore - a.matchScore;
        }

        if (sortMode === sortModes.hybrid) {
            // Hybrid: balance distance and match score
            // Normalize scores to 0-100 and 0-100
            const maxDistance = Math.max(...restaurants.map((r) => r.distance || 0), 1);
            const aNormalizedDistance = (a.distance || 0) / maxDistance * 100;
            const bNormalizedDistance = (b.distance || 0) / maxDistance * 100;
            
            // 60% weight on match score, 40% on distance
            const aScore = (a.matchScore || 0) * 0.6 + (100 - aNormalizedDistance) * 0.4;
            const bScore = (b.matchScore || 0) * 0.6 + (100 - bNormalizedDistance) * 0.4;
            
            return bScore - aScore;
        }

        return b.matchScore - a.matchScore || a.distance - b.distance;
    });
}

function applySortingAndRender() {
    sortRestaurants();
    currentPage = 1;
    renderRestaurants();
}

function getPlaceholderImage() {
    return "https://placehold.co/600x400?text=Restaurant";
}

function getDirectRestaurantImage(tags) {
    if (tags.image) {
        return tags.image;
    }

    if (tags.wikimedia_commons) {
        const fileName = tags.wikimedia_commons.replace("File:", "");
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
    }

    return "";
}

async function getWikidataImage(wikidataId) {
    if (!wikidataId) {
        return "";
    }

    const response = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`);
    const data = await response.json();
    const fileName = data.entities?.[wikidataId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;

    return fileName
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
        : "";
}

async function searchCommonsImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: `${query} restaurant`,
        gsrnamespace: "6",
        gsrlimit: "1",
        prop: "imageinfo",
        iiprop: "url",
        format: "json",
        origin: "*"
    });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    const data = await response.json();
    const page = Object.values(data.query?.pages || {})[0];

    return page?.imageinfo?.[0]?.url || "";
}

async function searchDuckDuckGoImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    try {
        const searchQuery = `${query} restaurant`;
        const params = new URLSearchParams({
            q: searchQuery,
            t: "h_",
            ia: "images",
            iax: "images"
        });
        const response = await fetch(`https://duckduckgo.com/?${params}`);

        if (!response.ok) {
            return "";
        }

        const html = await response.text();
        const match = html.match(/"image":"([^"]+)"/);
        return match ? match[1].replace(/\\\//g, "/") : "";
    } catch (error) {
        console.error("DuckDuckGo image search failed:", error);
        return "";
    }
}

async function searchGoogleRestaurantImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    try {
        const searchQuery = `${query} restaurant`;
        const params = new URLSearchParams({
            q: searchQuery,
            tbm: "isch"
        });
        const encodedUrl = `https://www.google.com/search?${params}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(encodedUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) return "";

        const html = await response.text();
        const match = html.match(/"ou":"([^"]+)"/);
        if (match && match[1]) {
            const url = match[1];
            return url.startsWith("http") ? url : "";
        }
        return "";
    } catch (error) {
        console.error("Google image search failed:", error);
        return "";
    }
}

async function searchUnsplashImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    try {
        const searchQuery = `${query} restaurant food`;
        const params = new URLSearchParams({
            query: searchQuery,
            per_page: "1",
            order_by: "relevant"
        });
        const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
            headers: {
                "Accept-Version": "v1"
            }
        });

        if (!response.ok) {
            return "";
        }

        const data = await response.json();
        return data.results?.[0]?.urls?.regular || "";
    } catch (error) {
        console.error("Unsplash image search failed:", error);
        return "";
    }
}

async function searchPixabayImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    try {
        const searchQuery = `${query} restaurant`;
        const params = new URLSearchParams({
            q: searchQuery,
            image_type: "photo",
            order: "popular",
            per_page: "3",
            safesearch: "true"
        });
        const response = await fetch(`https://pixabay.com/api/?${params}`);

        if (!response.ok) {
            return "";
        }

        const data = await response.json();
        return data.hits?.[0]?.webformatURL || data.hits?.[0]?.pixelURL || "";
    } catch (error) {
        console.error("Pixabay image search failed:", error);
        return "";
    }
}

async function resolveRestaurantImage(restaurant) {
    const cacheKey = `${restaurant.id}-${restaurant.name}`;

    if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey);
    }

    const tags = restaurant.tags || {};
    let imageUrl = getDirectRestaurantImage(tags);

    if (!imageUrl) {
        imageUrl = await getWikidataImage(tags.wikidata);
    }

    if (!imageUrl) {
        imageUrl = await searchGoogleRestaurantImage(`${restaurant.name} ${lastSearchLabel}`);
    }

    if (!imageUrl) {
        imageUrl = await searchPixabayImage(`${restaurant.name} ${lastSearchLabel}`);
    }

    if (!imageUrl) {
        imageUrl = await searchUnsplashImage(`${restaurant.name} ${lastSearchLabel}`);
    }

    if (!imageUrl) {
        imageUrl = await searchDuckDuckGoImage(`${restaurant.name} ${lastSearchLabel}`);
    }

    if (!imageUrl) {
        imageUrl = await searchCommonsImage(`${restaurant.name} ${lastSearchLabel}`);
    }

    imageUrl = imageUrl || getPlaceholderImage();
    imageCache.set(cacheKey, imageUrl);
    return imageUrl;
}

function getRestaurantAddress(tags) {
    const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:city"]
    ].filter(Boolean);

    return addressParts.join(", ") || "Address not available";
}

function isSavedRestaurant(name) {
    return userPreferences.savedRestaurants.some((restaurant) => restaurant.name === name);
}

function addPreferenceIfMissing(preferenceList, name, weight) {
    const exists = preferenceList.some(
        (item) => normalizeText(item.name) === normalizeText(name)
    );

    if (!exists && name) {
        preferenceList.push({ name, weight });
    }
}

async function saveRestaurantToFavorites(restaurant) {
    if (!isSavedRestaurant(restaurant.name)) {
        userPreferences.savedRestaurants.push({
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            address: restaurant.address
        });
    }

    if (restaurant.name !== "Unnamed restaurant") {
        addPreferenceIfMissing(userPreferences.favoriteRestaurants, restaurant.name, 4);
    }

    if (restaurant.cuisine) {
        restaurant.cuisine.split(",").forEach((cuisine) => {
            const name = cuisine.trim();
            addPreferenceIfMissing(userPreferences.favoriteCuisines, name, 3);
        });
    }

    await savePreferences();
    updatePreferenceSummary();
}

function renderRestaurants() {
    restaurantsList.innerHTML = "";

    if (restaurants.length === 0) {
        showMessage("No restaurants found for this location.");
        pagination.innerHTML = "";
        return;
    }

    const startIndex = (currentPage - 1) * restaurantsPerPage;
    const endIndex = startIndex + restaurantsPerPage;
    const restaurantsForPage = restaurants.slice(startIndex, endIndex);

    showMessage(`Showing ${startIndex + 1}-${Math.min(endIndex, restaurants.length)} of ${restaurants.length} restaurants.`);

    restaurantsForPage.forEach((restaurant) => {
        const tags = restaurant.tags || {};
        const listItem = document.createElement("li");
        listItem.className = "restaurant-card";

        const image = document.createElement("img");
        image.className = "loading-image";
        image.src = getPlaceholderImage();
        image.alt = `${restaurant.name} photo`;
        resolveRestaurantImage(restaurant)
            .then((imageUrl) => {
                image.src = imageUrl;
                image.classList.remove("loading-image");
            })
            .catch((error) => {
                console.error(error);
                image.classList.remove("loading-image");
            });

        const content = document.createElement("div");
        content.className = "restaurant-content";

        const matchRow = document.createElement("div");
        matchRow.className = "match-row";

        const title = document.createElement("h3");
        title.textContent = restaurant.name;

        const score = document.createElement("span");
        score.className = "match-score";
        score.textContent = `${restaurant.matchScore}% match`;

        const cuisine = document.createElement("p");
        cuisine.textContent = restaurant.cuisine ? `Cuisine: ${restaurant.cuisine}` : "Cuisine not listed";

        const address = document.createElement("p");
        address.textContent = restaurant.address;

        const distance = document.createElement("div");
        distance.className = "distance-badge";
        distance.textContent = Number.isFinite(restaurant.distance)
            ? `📍 ${restaurant.distance.toFixed(1)} km away`
            : "📍 Distance not available";

        const directionsButton = document.createElement("button");
        directionsButton.type = "button";
        directionsButton.className = "directions-button";
        directionsButton.textContent = "Directions";
        directionsButton.addEventListener("click", () => {
            const coords = getRestaurantCoordinates(restaurant);
            if (coords.lat && coords.lon) {
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}&destination_place_id=${restaurant.id}`;
                window.open(mapsUrl, "_blank");
            } else {
                const encodedName = encodeURIComponent(restaurant.name);
                const encodedAddress = encodeURIComponent(restaurant.address || "");
                const mapsUrl = `https://www.google.com/maps/search/${encodedName}+${encodedAddress}`;
                window.open(mapsUrl, "_blank");
            }
        });

        const reasons = document.createElement("ul");
        reasons.className = "reasons";
        restaurant.matchReasons.slice(0, 3).forEach((reason) => {
            const reasonItem = document.createElement("li");
            reasonItem.textContent = reason;
            reasons.appendChild(reasonItem);
        });

        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.className = isSavedRestaurant(restaurant.name)
            ? "favorite-button saved"
            : "favorite-button";
        favoriteButton.textContent = isSavedRestaurant(restaurant.name)
            ? "Saved"
            : "Save to favorites";
        favoriteButton.addEventListener("click", async () => {
            try {
                favoriteButton.textContent = "Saving...";
                favoriteButton.disabled = true;
                await saveRestaurantToFavorites(restaurant);
                favoriteButton.className = "favorite-button saved";
                favoriteButton.textContent = "Saved";

                if (lastSearchPoint) {
                    restaurants = enhanceRestaurants(restaurants, lastSearchPoint);
                    sortRestaurants();
                }
            } catch (error) {
                favoriteButton.disabled = false;
                favoriteButton.textContent = "Save to favorites";
                showMessage("Could not save that restaurant. Please try again.");
                console.error(error);
            }
        });

        const actionButtons = document.createElement("div");
        actionButtons.className = "action-buttons";
        actionButtons.appendChild(favoriteButton);
        actionButtons.appendChild(directionsButton);

        matchRow.appendChild(title);
        matchRow.appendChild(score);
        content.appendChild(matchRow);
        content.appendChild(cuisine);
        content.appendChild(address);
        content.appendChild(distance);
        content.appendChild(reasons);
        content.appendChild(actionButtons);
        listItem.appendChild(image);
        listItem.appendChild(content);
        restaurantsList.appendChild(listItem);
    });

    renderPagination();
}

function renderPagination() {
    pagination.innerHTML = "";

    const totalPages = Math.ceil(restaurants.length / restaurantsPerPage);

    if (totalPages <= 1) {
        return;
    }

    for (let page = 1; page <= totalPages; page++) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = page;
        button.className = page === currentPage ? "active" : "";

        button.addEventListener("click", () => {
            currentPage = page;
            renderRestaurants();
        });

        pagination.appendChild(button);
    }
}

function normalizeLocationQuery(location) {
    if (!location || typeof location !== "string") {
        return "";
    }

    const cleaned = location
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b(?:restaurant|restaurants|cafe|cafes|food|foods|hotel|hotels|eatery|eateries|dining|bar|pub|takeaway|near|around|in|at|for)\b/gi, "")
        .replace(/\s+/g, " ")
        .replace(/\s*,\s*/g, ", ")
        .trim();

    if (!cleaned || cleaned === ",") {
        return location.trim();
    }

    return cleaned
        .replace(/\s*,\s*$/, "")
        .replace(/^(?:,\s*)+|(?:\s*,\s*)+$/g, "")
        .trim();
}

function getPreferredLocationLabel(query) {
    const normalized = normalizeLocationQuery(query);
    if (!normalized) {
        return query?.trim() || "";
    }

    const cityLike = normalized
        .split(/\s*,\s*|\s+/)
        .filter(Boolean)
        .filter((part) => !/^(restaurant|restaurants|cafe|cafes|food|hotel|hotels|near|around|in|at|for)$/i.test(part));

    return cityLike.length ? cityLike.join(" ") : normalized;
}

async function geocodeWithOpenMeteo(query) {
    const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return (data.results || []).map((entry) => ({
        lat: Number(entry.latitude),
        lon: Number(entry.longitude),
        label: entry.name || query,
        display_name: `${entry.name}, ${entry.admin1 || ""}, ${entry.country || ""}`.replace(/,\s*,/g, ",").replace(/,\s*$/, "")
    }));
}

async function geocodeWithPhoton(query) {
    const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
    );

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return (data.features || []).map((feature) => ({
        lat: Number(feature.geometry.coordinates[1]),
        lon: Number(feature.geometry.coordinates[0]),
        label: feature.properties?.name || query,
        display_name: [
            feature.properties?.name,
            feature.properties?.city,
            feature.properties?.county,
            feature.properties?.state,
            feature.properties?.country
        ].filter(Boolean).join(", ")
    }));
}

async function geocodeWithNominatim(query) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=8&addressdetails=1&q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
        return [];
    }

    return await response.json();
}

async function getCoordinatesFromLocation(location) {
    const original = String(location || "").trim();
    const primaryQuery = normalizeLocationQuery(original);
    const candidates = [primaryQuery, original]
        .map((value) => value && value.trim())
        .filter(Boolean)
        .filter((value, index, array) => array.indexOf(value) === index);

    const providers = [
        geocodeWithOpenMeteo,
        geocodeWithPhoton,
        geocodeWithNominatim
    ];

    for (const query of candidates) {
        for (const provider of providers) {
            try {
                const data = await provider(query);
                if (!Array.isArray(data) || data.length === 0) {
                    continue;
                }

                const preferred = data.find((entry) => {
                    const type = (entry.type || entry.properties?.type || "").toLowerCase();
                    const className = (entry.class || entry.properties?.osm_key || "").toLowerCase();
                    const displayName = ((entry.display_name || entry.label || entry.properties?.name || "") + " " + (entry.properties?.city || "") + " " + (entry.properties?.state || "") + " " + (entry.properties?.country || "")).toLowerCase();
                    const queryText = query.toLowerCase();
                    const isAmenity = ["amenity", "restaurant", "cafe", "shop", "house"].includes(type) || ["amenity", "restaurant", "cafe", "shop", "railway"].includes(className);
                    return !isAmenity && (displayName.includes(queryText) || (entry.name || entry.properties?.name || "").toLowerCase().includes(queryText));
                }) || data.find((entry) => {
                    const type = (entry.type || entry.properties?.type || "").toLowerCase();
                    const className = (entry.class || entry.properties?.osm_key || "").toLowerCase();
                    return !["amenity", "restaurant", "cafe", "shop", "house"].includes(type) && !["amenity", "restaurant", "cafe", "shop", "railway"].includes(className);
                }) || data[0];

                const lat = Number(preferred.lat ?? preferred.latitude ?? preferred.geometry?.coordinates?.[1]);
                const lon = Number(preferred.lon ?? preferred.longitude ?? preferred.geometry?.coordinates?.[0]);

                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    return {
                        lat,
                        lon,
                        label: getPreferredLocationLabel(query)
                    };
                }
            } catch (error) {
                console.error("Geocoding failed for query:", query, provider.name, error);
            }
        }
    }

    throw new Error("Location not found");
}

async function getRestaurants(lat, lon) {
    const query = `
    [out:json][timeout:25];

    (
      node["amenity"="restaurant"](around:5000,${lat},${lon});
      way["amenity"="restaurant"](around:5000,${lat},${lon});
      relation["amenity"="restaurant"](around:5000,${lat},${lon});
    );

    out center tags;
    `;

    const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
            method: "POST",
            body: query
        }
    );

    const data = await response.json();
    lastSearchPoint = { lat: Number(lat), lon: Number(lon) };
    lastSearchLabel = getPreferredLocationLabel(locationInput.value || "") || "restaurant";
    restaurants = enhanceRestaurants(data.elements || [], lastSearchPoint);
    applySortingAndRender();
}

async function searchByLocation(location) {
    try {
        restaurantsList.innerHTML = "";
        pagination.innerHTML = "";
        showMessage("Finding your location...");

        const coordinates = await getCoordinatesFromLocation(location);
        lastSearchLabel = coordinates.label || getPreferredLocationLabel(location) || location.trim();

        showMessage("Loading restaurants near that location...");
        await getRestaurants(coordinates.lat, coordinates.lon);
    } catch (error) {
        restaurants = [];
        restaurantsList.innerHTML = "";
        pagination.innerHTML = "";
        showMessage("Could not find restaurants for that location. Please try another search.");
        console.error(error);
    }
}

function requestCurrentLocation() {
    if (!navigator.geolocation) {
        showMessage("Your browser does not support location access.");
        return;
    }

    restaurantsList.innerHTML = "";
    pagination.innerHTML = "";
    showMessage("Requesting your current location...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                showMessage("Loading restaurants near you...");
                await getRestaurants(position.coords.latitude, position.coords.longitude);
            } catch (error) {
                showMessage("Could not load restaurants near you. Please try again later.");
                console.error(error);
            }
        },
        () => {
            showMessage("Location permission was denied. Please enter your location manually.");
        }
    );
}

function updateAuthUi() {
    const isSignedIn = Boolean(currentUser);

    appShell.hidden = !isSignedIn;
    signInButton.hidden = isSignedIn;
    signOutButton.hidden = !isSignedIn;
    authStatus.textContent = isSignedIn
        ? `Signed in as ${currentUser.name}`
        : "Not signed in";

    if (isSignedIn) {
        showMessage("Enter a location or use your current location.");
    }
}

function openAuthDialog(mode) {
    authMode = mode;
    authError.textContent = "";
    authForm.reset();
    authTitle.textContent = authMode === "signUp" ? "Create account" : "Sign in";
    authSubmitButton.textContent = authMode === "signUp" ? "Create account" : "Sign in";
    authNameLabel.hidden = authMode !== "signUp";
    showSignInButton.classList.toggle("active", authMode === "signIn");
    showSignUpButton.classList.toggle("active", authMode === "signUp");

    if (!authDialog.open) {
        authDialog.showModal();
    }
}

function completeAuthentication(user, token) {
    setSignedInUser(user, token);
    authDialog.close();

    if (!currentUser.onboardingComplete) {
        openPreferencesDialog();
    }
}

function openPreferencesDialog() {
    fillPreferencesForm();
    preferencesDialog.showModal();
}

function exportPreferences() {
    const blob = new Blob([JSON.stringify(userPreferences, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "restaurant-preferences.json";
    link.click();
    URL.revokeObjectURL(url);
}

function importPreferences(file) {
    const reader = new FileReader();

    reader.addEventListener("load", async () => {
        try {
            userPreferences = normalizePreferences(JSON.parse(reader.result));
            await savePreferences();
            fillPreferencesForm();
            updatePreferenceSummary();
            showMessage("Preferences imported successfully.");

            if (lastSearchPoint) {
                restaurants = enhanceRestaurants(restaurants, lastSearchPoint);
                applySortingAndRender();
            }
        } catch (error) {
            showMessage("Could not import that preferences file.");
            console.error(error);
        }
    });

    reader.readAsText(file);
}

let autocompleteTimeout;
let autocompleteResults = [];
let selectedAutocompleteIndex = -1;

async function fetchLocationSuggestions(input) {
    const normalizedInput = normalizeLocationQuery(input);

    if (normalizedInput.length < 2) {
        locationAutocomplete.classList.remove("active");
        locationAutocomplete.innerHTML = "";
        return;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(normalizedInput)}`
        );
        const data = await response.json();
        autocompleteResults = data;

        locationAutocomplete.innerHTML = "";
        if (data.length > 0) {
            locationAutocomplete.classList.add("active");
            data.forEach((result, index) => {
                const li = document.createElement("li");
                li.textContent = result.display_name;
                li.addEventListener("click", () => {
                    locationInput.value = result.display_name;
                    locationAutocomplete.classList.remove("active");
                    locationAutocomplete.innerHTML = "";
                    autocompleteResults = [];
                });
                li.addEventListener("mouseenter", () => {
                    selectedAutocompleteIndex = index;
                    updateAutocompleteSelection();
                });
                locationAutocomplete.appendChild(li);
            });
            selectedAutocompleteIndex = -1;
        } else {
            locationAutocomplete.classList.remove("active");
        }
    } catch (error) {
        console.error("Location autocomplete error:", error);
        locationAutocomplete.classList.remove("active");
    }
}

function updateAutocompleteSelection() {
    const items = locationAutocomplete.querySelectorAll("li");
    items.forEach((item, index) => {
        if (index === selectedAutocompleteIndex) {
            item.classList.add("selected");
        } else {
            item.classList.remove("selected");
        }
    });
}

locationInput.addEventListener("input", (event) => {
    clearTimeout(autocompleteTimeout);
    const value = event.target.value.trim();
    selectedAutocompleteIndex = -1;

    if (value.length < 2) {
        locationAutocomplete.classList.remove("active");
        locationAutocomplete.innerHTML = "";
        return;
    }

    autocompleteTimeout = setTimeout(() => {
        fetchLocationSuggestions(value);
    }, 300);
});

locationInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, autocompleteResults.length - 1);
        updateAutocompleteSelection();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
        updateAutocompleteSelection();
    } else if (event.key === "Enter" && selectedAutocompleteIndex >= 0) {
        event.preventDefault();
        const result = autocompleteResults[selectedAutocompleteIndex];
        if (result) {
            locationInput.value = result.display_name;
            locationAutocomplete.classList.remove("active");
            locationAutocomplete.innerHTML = "";
            autocompleteResults = [];
        }
    } else if (event.key === "Escape") {
        locationAutocomplete.classList.remove("active");
        locationAutocomplete.innerHTML = "";
        autocompleteResults = [];
    }
});

document.addEventListener("click", (event) => {
    if (event.target !== locationInput && !locationAutocomplete.contains(event.target)) {
        locationAutocomplete.classList.remove("active");
    }
});

locationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const location = locationInput.value.trim();

    if (!location) {
        showMessage("Please enter a location first.");
        return;
    }

    searchByLocation(location);
});

currentLocationButton.addEventListener("click", requestCurrentLocation);

preferencesButton.addEventListener("click", openPreferencesDialog);

signInButton.addEventListener("click", () => {
    openAuthDialog("signIn");
});

signOutButton.addEventListener("click", signOut);

showSignInButton.addEventListener("click", () => {
    openAuthDialog("signIn");
});

showSignUpButton.addEventListener("click", () => {
    openAuthDialog("signUp");
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    try {
        const data = authMode === "signUp"
            ? createUser(authNameInput.value.trim(), email, password)
            : authenticateUser(email, password);

        const authData = await data;
        completeAuthentication(authData.user, authData.token);
    } catch (error) {
        authError.textContent = error.message;
    }
});

preferencesForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        await readPreferencesForm();
        await savePreferences({ onboardingComplete: true });
        preferencesDialog.close();
        showMessage("Preferences saved. Search a location to see smarter matches.");

        if (lastSearchPoint) {
            restaurants = enhanceRestaurants(restaurants, lastSearchPoint);
            applySortingAndRender();
        }
    } catch (error) {
        showMessage("Could not save preferences. Please try again.");
        console.error(error);
    }
});

skipPreferencesButton.addEventListener("click", async () => {
    try {
        await savePreferences({ onboardingComplete: true });
        preferencesDialog.close();
    } catch (error) {
        showMessage("Could not update onboarding status.");
        console.error(error);
    }
});

clearPreferencesButton.addEventListener("click", async () => {
    userPreferences = createDefaultPreferences();
    try {
        await savePreferences();
        fillPreferencesForm();
        updatePreferenceSummary();
        showMessage("Preferences cleared.");
    } catch (error) {
        showMessage("Could not clear preferences.");
        console.error(error);
    }
});

bestMatchesButton.addEventListener("click", () => {
    sortMode = sortModes.best;
    bestMatchesButton.classList.add("active");
    closestButton.classList.remove("active");
    hybridButton.classList.remove("active");
    applySortingAndRender();
});

closestButton.addEventListener("click", () => {
    sortMode = sortModes.closest;
    closestButton.classList.add("active");
    bestMatchesButton.classList.remove("active");
    hybridButton.classList.remove("active");
    applySortingAndRender();
});

hybridButton.addEventListener("click", () => {
    sortMode = sortModes.hybrid;
    hybridButton.classList.add("active");
    bestMatchesButton.classList.remove("active");
    closestButton.classList.remove("active");
    applySortingAndRender();
});

exportPreferencesButton.addEventListener("click", exportPreferences);

importPreferencesInput.addEventListener("change", () => {
    const file = importPreferencesInput.files[0];

    if (file) {
        importPreferences(file);
    }
});

async function initializeApp() {
    try {
        currentUser = await loadCurrentUser();
        userPreferences = loadPreferences();
        updateAuthUi();
        updatePreferenceSummary();

        if (currentUser) {
            if (!currentUser.onboardingComplete) {
                openPreferencesDialog();
            }
        } else {
            openAuthDialog("signIn");
        }
    } catch (error) {
        localStorage.removeItem(authTokenStorageKey);
        currentUser = null;
        userPreferences = createDefaultPreferences();
        updateAuthUi();
        updatePreferenceSummary();
        openAuthDialog("signIn");
    }
}

initializeApp();
