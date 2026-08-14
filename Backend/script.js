const locationForm = document.getElementById("locationForm");
const locationInput = document.getElementById("locationInput");
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
const bestMatchesButton = document.getElementById("bestMatchesButton");
const closestButton = document.getElementById("closestButton");
const exportPreferencesButton = document.getElementById("exportPreferencesButton");
const importPreferencesInput = document.getElementById("importPreferencesInput");
const preferencesDialog = document.getElementById("preferencesDialog");
const preferencesForm = document.getElementById("preferencesForm");
const skipPreferencesButton = document.getElementById("skipPreferencesButton");
const clearPreferencesButton = document.getElementById("clearPreferencesButton");
const favoriteRestaurantsInput = document.getElementById("favoriteRestaurantsInput");
const favoriteRestaurantsWeight = document.getElementById("favoriteRestaurantsWeight");
const favoriteCuisinesInput = document.getElementById("favoriteCuisinesInput");
const favoriteCuisinesWeight = document.getElementById("favoriteCuisinesWeight");
const favoriteDishesInput = document.getElementById("favoriteDishesInput");
const favoriteDishesWeight = document.getElementById("favoriteDishesWeight");
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
const sortModes = {
    best: "best",
    closest: "closest"
};

let authMode = "signIn";
let currentUser = null;
let userPreferences = createDefaultPreferences();
let restaurants = [];
let currentPage = 1;
let sortMode = sortModes.best;
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
    favoriteRestaurantsInput.value = userPreferences.favoriteRestaurants.map((item) => item.name).join(", ");
    favoriteRestaurantsWeight.value = userPreferences.favoriteRestaurants[0]?.weight || 3;
    favoriteCuisinesInput.value = userPreferences.favoriteCuisines.map((item) => item.name).join(", ");
    favoriteCuisinesWeight.value = userPreferences.favoriteCuisines[0]?.weight || 5;
    favoriteDishesInput.value = userPreferences.favoriteDishes.map((item) => item.name).join(", ");
    favoriteDishesWeight.value = userPreferences.favoriteDishes[0]?.weight || 4;
    tasteProfileInput.value = userPreferences.tasteProfile;
}

function summarizePreferenceList(items) {
    if (items.length === 0) {
        return "None yet";
    }

    return items.slice(0, 4).map((item) => item.name).join(", ") +
        (items.length > 4 ? ` +${items.length - 4} more` : "");
}

function updatePreferenceSummary() {
    favoriteRestaurantsSummary.textContent = summarizePreferenceList(userPreferences.favoriteRestaurants);
    favoriteCuisinesSummary.textContent = summarizePreferenceList(userPreferences.favoriteCuisines);
    favoriteDishesSummary.textContent = summarizePreferenceList(userPreferences.favoriteDishes);
    savedRestaurantsSummary.textContent = `${userPreferences.savedRestaurants.length} restaurants`;
    tasteSignatureText.textContent = userPreferences.tasteSignature
        ? `Taste signature: ${userPreferences.tasteSignature}`
        : "Set your taste preferences to improve recommendations.";
}

async function readPreferencesForm() {
    userPreferences.favoriteRestaurants = parsePreferenceTextarea(
        favoriteRestaurantsInput.value,
        favoriteRestaurantsWeight.value
    );
    userPreferences.favoriteCuisines = parsePreferenceTextarea(
        favoriteCuisinesInput.value,
        favoriteCuisinesWeight.value
    );
    userPreferences.favoriteDishes = parsePreferenceTextarea(
        favoriteDishesInput.value,
        favoriteDishesWeight.value
    );
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

        const distance = document.createElement("p");
        distance.textContent = Number.isFinite(restaurant.distance)
            ? `${restaurant.distance.toFixed(1)} km straight-line`
            : "Distance not available";

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

        matchRow.appendChild(title);
        matchRow.appendChild(score);
        content.appendChild(matchRow);
        content.appendChild(cuisine);
        content.appendChild(address);
        content.appendChild(distance);
        content.appendChild(reasons);
        content.appendChild(favoriteButton);
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

async function getCoordinatesFromLocation(location) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`
    );
    const data = await response.json();

    if (data.length === 0) {
        throw new Error("Location not found");
    }

    return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon)
    };
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
    restaurants = enhanceRestaurants(data.elements || [], lastSearchPoint);
    applySortingAndRender();
}

async function searchByLocation(location) {
    try {
        restaurantsList.innerHTML = "";
        pagination.innerHTML = "";
        showMessage("Finding your location...");

        const coordinates = await getCoordinatesFromLocation(location);

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
    applySortingAndRender();
});

closestButton.addEventListener("click", () => {
    sortMode = sortModes.closest;
    closestButton.classList.add("active");
    bestMatchesButton.classList.remove("active");
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
