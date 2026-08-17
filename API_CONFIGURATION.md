# Restaurant Finder - API Configuration Guide

## Overview

This app uses mostly **free APIs**. The core features (search, geocoding, images) work without any API keys. AI recommendations require a Gemini API key, and user accounts are stored in MongoDB Atlas.

---

## APIs Used

### 1. Geocoding - Converting location names to coordinates

Three providers are used with automatic fallback:

| Provider | URL | Used In | Key Required |
|----------|-----|---------|:---:|
| **Nominatim** (primary) | `https://nominatim.openstreetmap.org/search` | `script.js` - location autocomplete, `getCoordinatesFromLocation()` | No |
| **Open-Meteo** (fallback) | `https://geocoding-api.open-meteo.com/v1/search` | `script.js` - `geocodeWithOpenMeteo()` | No |
| **Photon/Komoot** (fallback) | `https://photon.komoot.io/api/` | `script.js` - `geocodeWithPhoton()`, favorite restaurant autocomplete | No |

- **Rate Limits**: Nominatim ~1 req/sec, Open-Meteo and Photon are generous
- All three are free and require no API keys

### 2. Restaurant Data - Finding nearby restaurants

- **API**: Overpass API (OpenStreetMap)
- **URL**: `https://overpass-api.de/api/interpreter`
- **Location in code**: `script.js` - `getRestaurants()`
- **Search radius**: 5 km
- **Data source**: OpenStreetMap (community maintained, open data)
- **Key required**: No
- **Status**: Free, no changes needed

### 3. Restaurant Images

Images are resolved in this order:

| Priority | Source | Function | Key Required |
|:--------:|--------|----------|:---:|
| 1 | Direct image tag from OSM | `getDirectRestaurantImage()` | No |
| 2 | Wikimedia Commons file tag from OSM | `getDirectRestaurantImage()` | No |
| 3 | Wikimedia Commons search | `searchCommonsImage()` | No |
| 4 | Placeholder image | `getPlaceholderImage()` | No |

- **Wikimedia Commons API**: `https://commons.wikimedia.org/w/api.php`
- All sources are free and require no API keys

### 4. AI Recommendations

- **API**: Google Gemini (`gemini-2.0-flash`)
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Location in code**: `server.js` - `callGemini()`, called by `/api/ai/recommend` endpoint
- **Key required**: Yes - set `GEMINI_API_KEY` in `.env`
- **Fallback**: If no key is set or the API fails, the app uses local text-based scoring instead
- **How to get a key**: https://aistudio.google.com/apikey (free tier available)

### 5. Database - User accounts and preferences

- **Service**: MongoDB Atlas (cloud)
- **Driver**: Mongoose
- **Location in code**: `server.js` - `connectToDatabase()`, `loadDatabase()`, `saveDatabase()`
- **Fallback**: Local `Backend/database.json` file if MongoDB is unreachable
- **Key required**: Yes - set `MONGODB_URI` in `.env`
- **Setup**: Create a free cluster at https://cloud.mongodb.com, whitelist your IP (or `0.0.0.0/0` for development)

### 6. Directions (URL only, no API key)

- Google Maps directions links are constructed as URLs (not API calls)
- Format: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` or `https://www.google.com/maps/search/NAME+ADDRESS`
- No API key needed

---

## Environment Variables (.env)

```env
PORT=5501
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=Cluster0
GEMINI_API_KEY=your_gemini_api_key_here
```

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PORT` | No | Server port (default: 5501) |
| `MONGODB_URI` | Recommended | MongoDB Atlas connection string. Without it, falls back to local JSON file |
| `GEMINI_API_KEY` | Optional | Enables AI-powered restaurant recommendations. Without it, local scoring is used |

---

## API Comparison Table

| API | Type | Cost | Limit | Key Needed |
|-----|------|------|-------|:----------:|
| Nominatim | Geocoding | FREE | ~1/sec | No |
| Open-Meteo | Geocoding | FREE | Generous | No |
| Photon/Komoot | Geocoding + Autocomplete | FREE | Generous | No |
| Overpass | Restaurant Data | FREE | Varies | No |
| Wikimedia Commons | Images | FREE | Generous | No |
| Google Gemini | AI Recommendations | Free tier | 15 req/min | Yes |
| MongoDB Atlas | Database | Free tier (512MB) | Unlimited | Yes |

---

## Removed APIs (No Longer Used)

The following APIs were removed because they were unreliable or required unconfigured API keys:

- **Pixabay** - Required an API key that was never configured, always failed
- **Unsplash** - Required an API key that was never configured, always failed
- **DuckDuckGo Image Search** - Web scraping approach, blocked by anti-scraping measures
- **Google Image Search** - Proxy scraping approach, blocked by anti-scraping measures
- **Wikidata** - Almost no restaurants have Wikidata IDs, rarely returned results

---

## Common Questions

**Q: Can the app work without any API keys?**
A: Yes. Without `GEMINI_API_KEY`, local scoring is used. Without `MONGODB_URI`, a local JSON file stores data. But for shared logins across devices, MongoDB Atlas is needed.

**Q: Why aren't all restaurants showing?**
A: Overpass API data comes from OpenStreetMap, which relies on community contributions. Some areas have better coverage than others.

**Q: Why do some restaurants show a placeholder image?**
A: Most restaurants in OpenStreetMap don't have photos. The app tries Wikimedia Commons as a fallback, but not all restaurants have images there either.

**Q: How do I get better AI recommendations?**
A: Make sure `GEMINI_API_KEY` is set in your `.env` file. Fill out all preference categories (cuisines, dishes, dietary, atmosphere, budget) for more personalized results.

---

## Security Notes

- All external APIs use HTTPS
- API keys are stored in `.env` (never committed to Git)
- User passwords are hashed with PBKDF2 (SHA-512, 120,000 iterations)
- Session tokens are 32-byte random hex strings
- Preferences are stored per-user in the database (not shared)
