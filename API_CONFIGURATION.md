# Restaurant Finder - API Configuration Guide

## 🎯 Overview

This app uses **completely free APIs** - no API keys or subscriptions needed! The current setup uses the best free options available.

## 📍 Current APIs (All Free, No Keys Required)

### 1. **Geocoding** - Converting location names to coordinates
- **API**: Nominatim (OpenStreetMap)
- **URL**: `https://nominatim.openstreetmap.org/search`
- **Location in code**: `script.js` → `getCoordinatesFromLocation()` function
- **Rate Limit**: ~1 request per second
- **Status**: ✅ Working great, no changes needed

### 2. **Restaurant Data** - Finding nearby restaurants
- **API**: Overpass API (OpenStreetMap data)
- **URL**: `https://overpass-api.de/api/interpreter`
- **Location in code**: `script.js` → `getRestaurants()` function
- **Search radius**: 5 km (can be customized)
- **Data source**: OpenStreetMap (community maintained, open data)
- **Status**: ✅ Working great, no changes needed

### 3. **Restaurant Images** - Showing pictures
Multiple FREE fallback sources (automatically tries each in order):
1. **Pixabay** - `searchPixabayImage()` function
2. **Unsplash** - `searchUnsplashImage()` function  
3. **Wikimedia Commons** - `searchCommonsImage()` function
4. **Wikidata** - `getWikidataImage()` function

All are completely free with no API keys!

---

## 🔧 How to Change APIs (If Needed Later)

### Option 1: Change to Google Places API

If you want more data or different search parameters:

**Step 1**: Get a free/paid Google API Key
- Go to: https://console.cloud.google.com/
- Create a project
- Enable "Places API" and "Geocoding API"
- Create credentials (API Key)
- Set billing (free tier: 1,000 calls/month)

**Step 2**: Update `script.js` - Find and modify `getRestaurants()` function

Replace this:
```javascript
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
        { method: "POST", body: query }
    );
```

With this:
```javascript
async function getRestaurants(lat, lon) {
    const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=5000&type=restaurant&key=YOUR_API_KEY_HERE`,
        { method: "GET" }
    );
```

**Step 3**: Update the response parsing since Google has different JSON structure

### Option 2: Change Image Source

Images already have fallbacks, but if you want to add Pexels:

**Step 1**: Get free Pexels API key from https://www.pexels.com/api/

**Step 2**: Add this function to `script.js`:
```javascript
async function searchPexelsImage(query) {
    if (!query || query === "Unnamed restaurant") {
        return "";
    }

    try {
        const response = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " restaurant")}&per_page=1`,
            {
                headers: {
                    "Authorization": "YOUR_PEXELS_API_KEY"
                }
            }
        );

        if (!response.ok) return "";
        const data = await response.json();
        return data.photos?.[0]?.src?.medium || "";
    } catch (error) {
        console.error("Pexels error:", error);
        return "";
    }
}
```

**Step 3**: Add it to `resolveRestaurantImage()` before the placeholder:
```javascript
if (!imageUrl) {
    imageUrl = await searchPexelsImage(`${restaurant.name} ${lastSearchLabel}`);
}
```

### Option 3: Change Geocoding to MapBox

**Step 1**: Get free MapBox API key from https://mapbox.com/

**Step 2**: Find `getCoordinatesFromLocation()` and replace:

```javascript
// Old (Nominatim):
const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`
);

// New (MapBox):
const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=YOUR_MAPBOX_KEY`
);

// Also update parsing:
// Nominatim: data[0].lat / data[0].lon
// MapBox: data.features[0].center (which is [lon, lat] - reversed!)
```

---

## 🌟 Recommended Configuration

**For Best Results (No paid services needed):**
- ✅ Keep **Nominatim** for location search (fast, reliable)
- ✅ Keep **Overpass API** for restaurant data (best OSM data)
- ✅ Keep **Pixabay + Unsplash** for images (always gives results)

**If You Need More Data:**
- Upgrade to **Google Places API** (~$5-30/month)
- Gives more comprehensive restaurant data
- Better data quality in developed countries

**If You're Hitting Rate Limits:**
- All APIs have rate limits but generous free tiers
- Nominatim: ~1 req/sec (add 1 second delay between searches)
- Overpass: Varies by time (usually fine)
- Pixabay/Unsplash: Thousands per day

---

## 📊 API Comparison Table

| API | Type | Cost | Limit | Quality | Notes |
|-----|------|------|-------|---------|-------|
| Nominatim | Geocoding | FREE | ~1/sec | Good | No API key |
| Overpass | Restaurant Data | FREE | Varies | Excellent | Open data, OSM |
| Pixabay | Images | FREE | 50/hr | Good | No key needed |
| Unsplash | Images | FREE | Unlimited | Great | No key needed |
| Google Places | All-in-one | Paid | 1000/mo free | Excellent | ~$7-30/mo |
| MapBox | Geocoding | Paid | 600/mo free | Great | ~$0.50/100k |

---

## 🚀 Next Steps

1. **Test current setup** - Everything should work as-is
2. **If data is sparse** - Search radius is 5km, try different locations
3. **If you want better data** - Consider Google Places API
4. **If rate limited** - Add delays or upgrade to paid tier

---

## ❓ Common Questions

**Q: Do I need API keys?**
A: No! Current setup is completely free and anonymous.

**Q: Why isn't my location showing?**
A: Could be one of these:
- Nominatim search is case-sensitive - try "new york" not "NEW YORK"
- Location needs to exist in OpenStreetMap data
- Check browser console for errors

**Q: Why aren't all restaurants showing?**
A: Overpass API data comes from OpenStreetMap, which relies on community contributions. Some areas have better coverage than others.

**Q: How do I see my own restaurant?**
A: Add it to OpenStreetMap (free, open source map) - takes 1-2 weeks to appear in Overpass API

**Q: Can I cache results?**
A: Yes! The app already caches images. For restaurants, you could add localStorage caching in `getRestaurants()`.

---

## 🔐 Security Notes

- All APIs use HTTPS
- No sensitive data is stored locally except your preferences
- Preferences are stored per-user in backend database (not shared)
- Images are loaded from external CDNs (safe)

Happy searching! 🍽️
