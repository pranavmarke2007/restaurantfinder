const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const port = process.env.PORT || 5501;
const publicDir = __dirname;
const databasePath = path.join(__dirname, "database.json");

const contentTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json"
};

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

function createEmptyDatabase() {
    return {
        users: [],
        sessions: []
    };
}

function loadDatabase() {
    if (!fs.existsSync(databasePath)) {
        saveDatabase(createEmptyDatabase());
    }

    return JSON.parse(fs.readFileSync(databasePath, "utf8"));
}

function saveDatabase(database) {
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS"
    });
    response.end(JSON.stringify(data));
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk;
        });

        request.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
    return { salt, hash };
}

function isPasswordValid(password, user) {
    const passwordData = hashPassword(password, user.passwordSalt);
    return crypto.timingSafeEqual(
        Buffer.from(passwordData.hash, "hex"),
        Buffer.from(user.passwordHash, "hex")
    );
}

function createPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences || createDefaultPreferences(),
        onboardingComplete: Boolean(user.onboardingComplete),
        createdAt: user.createdAt
    };
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callGemini(prompt) {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
        throw new Error("Empty response from Gemini API.");
    }

    return JSON.parse(textContent);
}


function getAuthToken(request) {
    const header = request.headers.authorization || "";
    return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function getUserFromRequest(request, database) {
    const token = getAuthToken(request);
    const session = database.sessions.find((item) => item.token === token);

    if (!session) {
        return null;
    }

    return database.users.find((user) => user.id === session.userId) || null;
}

async function handleApi(request, response) {
    const database = loadDatabase();

    if (request.method === "POST" && request.url === "/api/auth/signup") {
        const body = await readJsonBody(request);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const name = String(body.name || "").trim() || email.split("@")[0];

        if (!email || !password) {
            return sendJson(response, 400, { message: "Email and password are required." });
        }

        if (password.length < 6) {
            return sendJson(response, 400, { message: "Password must be at least 6 characters." });
        }

        if (database.users.some((user) => user.email === email)) {
            return sendJson(response, 409, { message: "An account with this email already exists." });
        }

        const passwordData = hashPassword(password);
        const user = {
            id: crypto.randomUUID(),
            name,
            email,
            passwordSalt: passwordData.salt,
            passwordHash: passwordData.hash,
            preferences: createDefaultPreferences(),
            onboardingComplete: false,
            createdAt: new Date().toISOString()
        };
        const token = crypto.randomBytes(32).toString("hex");

        database.users.push(user);
        database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
        saveDatabase(database);

        return sendJson(response, 201, { token, user: createPublicUser(user) });
    }

    if (request.method === "POST" && request.url === "/api/auth/login") {
        const body = await readJsonBody(request);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = database.users.find((item) => item.email === email);

        if (!user || !isPasswordValid(password, user)) {
            return sendJson(response, 401, { message: "Invalid email or password." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        database.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
        saveDatabase(database);

        return sendJson(response, 200, { token, user: createPublicUser(user) });
    }

    if (request.method === "POST" && request.url === "/api/auth/logout") {
        const token = getAuthToken(request);
        const nextSessions = database.sessions.filter((session) => session.token !== token);
        saveDatabase({ ...database, sessions: nextSessions });
        return sendJson(response, 200, { message: "Signed out." });
    }

    if (request.method === "GET" && request.url === "/api/me") {
        const user = getUserFromRequest(request, database);

        if (!user) {
            return sendJson(response, 401, { message: "Not signed in." });
        }

        return sendJson(response, 200, { user: createPublicUser(user) });
    }

    if (request.method === "PUT" && request.url === "/api/preferences") {
        const user = getUserFromRequest(request, database);

        if (!user) {
            return sendJson(response, 401, { message: "Not signed in." });
        }

        const body = await readJsonBody(request);
        user.preferences = body.preferences || createDefaultPreferences();

        if (typeof body.onboardingComplete === "boolean") {
            user.onboardingComplete = body.onboardingComplete;
        }

        saveDatabase(database);
        return sendJson(response, 200, { user: createPublicUser(user) });
    }

    if (request.method === "POST" && request.url === "/api/ai/recommend") {
        const user = getUserFromRequest(request, database);

        if (!user) {
            return sendJson(response, 401, { message: "Not signed in." });
        }

        const body = await readJsonBody(request);
        const preferences = body.preferences;
        const candidates = body.restaurants || [];

        if (!preferences) {
            return sendJson(response, 400, { message: "Preferences are required." });
        }

        if (candidates.length === 0) {
            return sendJson(response, 200, { matches: [] });
        }

        const cleanCandidates = candidates.map(r => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine || r.tags?.cuisine || "",
            address: r.address || "",
            tags: {
                amenity: r.tags?.amenity,
                cuisine: r.tags?.cuisine,
                description: r.tags?.description,
                brand: r.tags?.brand
            }
        }));

        const prompt = `
You are TasteTwin, an expert AI travel guide and culinary matchmaking engine.
The user is visiting a new city. Help match their local food preferences to nearby restaurants.

USER'S LOCAL PREFERENCES:
- Favorite Restaurants: ${JSON.stringify(preferences.favoriteRestaurants || [])}
- Favorite Cuisines: ${JSON.stringify(preferences.favoriteCuisines || [])}
- Favorite Dishes: ${JSON.stringify(preferences.favoriteDishes || [])}
- Dietary Preferences: ${JSON.stringify(preferences.dietaryPreferences || [])}
- Vibe/Atmosphere: ${JSON.stringify(preferences.atmosphere || [])}
- Budget Range: ${JSON.stringify(preferences.budget || [])}
- Taste Profile Notes: "${preferences.tasteProfile || ""}"

NEARBY RESTAURANTS IN THE VISITED CITY:
${JSON.stringify(cleanCandidates)}

INSTRUCTIONS:
1. Match the nearby restaurants against the user's taste preferences.
2. Consider semantic matches. For example, if they like a certain local spot, look for nearby equivalents that serve the same food culture, thali styles, casual fast-food, or specific cuisines.
3. Assign a match score from 0 to 100 for each restaurant.
4. Write a highly personalized, friendly reason for each match (max 20 words). E.g. "Similar to [Favorite] because of its homestyle Thali styling." or "Matches your love for [Cuisine]."
5. Return the scores and reasons strictly in this JSON format:
{
  "matches": [
    {
      "id": 12345, // ID from the candidates list (must be the exact same type: integer or string)
      "score": 92,
      "reason": "Personalized match reason explaining similarity to their favorite restaurant or preferences"
    }
  ]
}
`;

        try {
            const aiResponse = await callGemini(prompt);
            return sendJson(response, 200, aiResponse);
        } catch (error) {
            console.error("AI Recommendation failed:", error);
            return sendJson(response, 500, { message: "AI recommendation failed.", error: error.message });
        }
    }

    return sendJson(response, 404, { message: "API route not found." });
}

function serveStatic(request, response) {
    const urlPath = decodeURIComponent(request.url.split("?")[0]);
    let filePath = urlPath === "/" ? path.join(publicDir, "index.html") : path.join(publicDir, urlPath);

    if (!filePath.startsWith(publicDir)) {
        response.writeHead(403);
        return response.end("Forbidden");
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            response.writeHead(404);
            return response.end("Not found");
        }

        response.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filePath)] || "text/plain"
        });
        response.end(data);
    });
}

const server = http.createServer((request, response) => {
    if (request.method === "OPTIONS") {
        response.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS"
        });
        response.end();
        return;
    }

    if (request.url.startsWith("/api/")) {
        handleApi(request, response).catch((error) => {
            console.error(error);
            sendJson(response, 500, { message: "Server error." });
        });
        return;
    }

    serveStatic(request, response);
});

server.listen(port, () => {
    console.log(`Restaurant Finder running at http://localhost:${port}`);
});
