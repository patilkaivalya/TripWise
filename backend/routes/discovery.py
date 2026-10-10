import math
import re
from urllib.parse import quote_plus

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin

from services.serpapi_service import serpapi_search


discovery_bp = Blueprint("discovery", __name__)
FRONTEND_ORIGIN = "http://localhost:5174"
SEARCH_RADIUS_KM = 5.0
MAX_RESULTS_PER_CATEGORY = 5

# Exclude irrelevant businesses and infrastructure from attractions.
EXCLUDED_ATTRACTION_TERMS = (
    "tour operator", "tour agency", "travel agency", "travel agent",
    "sightseeing tour", "boat tour", "cruise agency", "tour package",
    "tour guide", "ticket agency", "taxi service", "car rental",
    "vehicle rental", "bus service", "transport service", "airport shuttle",
    "bridge", "parking lot", "parking garage", "bus station",
    "real estate agency", "corporate office", "office building",
)

EXCLUDED_BUSINESS_TYPES = (
    "tour operator", "travel agency", "taxi service", "car rental",
    "transportation service", "bus station", "parking", "real estate agency",
    "corporate office", "shopping mall", "store", "clothing store",
    "restaurant", "cafe", "bar", "hotel", "lodging", "spa",
)

# Recognizable tourist attraction names and categories.
ATTRACTION_TERMS = (
    "tourist attraction", "historical landmark", "historic landmark",
    "landmark", "museum", "art gallery", "national park", "nature preserve",
    "wildlife park", "theme park", "water park", "amusement park",
    "botanical garden", "garden", "beach", "waterfall", "fort", "palace",
    "temple", "church", "cathedral", "monument", "memorial",
    "heritage site", "archaeological site", "cave", "lake", "island",
    "viewpoint", "scenic spot", "hiking area", "zoo", "aquarium",
    "park", "sanctuary", "dam", "lighthouse", "ruins",
)


# ============================================================
# HELPERS
# ============================================================

def safe_https_url(value):
    if isinstance(value, str) and value.startswith("https://"):
        return value
    return None


def parse_number(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        match = re.search(r"\d[\d,]*", str(value or ""))
        return int(match.group(0).replace(",", "")) if match else 0


def parse_coordinate(value):
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate straight-line distance between two GPS coordinates."""
    earth_radius_km = 6371.0088

    lat1, lon1, lat2, lon2 = map(
        math.radians, (lat1, lon1, lat2, lon2)
    )

    d_lat = lat2 - lat1
    d_lon = lon2 - lon1

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(d_lon / 2) ** 2
    )

    return 2 * earth_radius_km * math.asin(
        math.sqrt(min(1, a))
    )


def get_meal_estimate(price):
    """Return a rough per-person INR estimate, not a confirmed menu price."""
    if not isinstance(price, str):
        return 350

    amounts = re.findall(r"\d[\d,]*", price)

    if "₹" in price and amounts:
        values = [
            int(value.replace(",", ""))
            for value in amounts
        ]
        values = [
            value for value in values
            if 0 < value <= 20000
        ]

        if len(values) >= 2:
            return round((values[0] + values[1]) / 2)

        if len(values) == 1:
            return values[0]

    return 350


def get_maps_results(query, latitude, longitude):
    """Search Google Maps near the selected hotel."""
    data = serpapi_search({
        "engine": "google_maps",
        "type": "search",
        "q": query,
        "ll": f"@{latitude},{longitude},14z",
        "nearby": "true",
        "hl": "en",
        "gl": "in",
    })

    results = data.get("local_results", []) or []

    return results if isinstance(results, list) else []


def quality_score(item):
    """Rank well-reviewed, highly rated, nearby places."""
    rating = item.get("rating") or 0
    reviews = item.get("reviews") or 0
    distance = item.get("distanceKm") or SEARCH_RADIUS_KM

    review_score = min(
        math.log10(reviews + 1) / 5, 1
    )

    proximity_score = max(
        0, 1 - distance / SEARCH_RADIUS_KM
    )

    return (
        rating * 0.65
        + review_score
        + proximity_score * 0.75
    )


def normalized_text(value):
    """Normalize text before checking names and categories."""
    return re.sub(
        r"[^a-z0-9]+",
        " ",
        str(value or "").lower()
    ).strip()


def contains_term(text, terms):
    """Match complete words or phrases rather than partial substrings."""
    normalized = f" {normalized_text(text)} "

    return any(
        f" {normalized_text(term)} " in normalized
        for term in terms
    )


def is_tourist_attraction(item):
    """
    Reject tour operators, unrelated businesses and generic bridges.
    Keep listings that have a recognizable attraction name or category.
    """
    if not isinstance(item, dict):
        return False

    name = item.get("title") or ""
    place_type = item.get("type") or ""

    raw_types = item.get("types") or []

    if not isinstance(raw_types, list):
        raw_types = [raw_types]

    type_text = " ".join(
        str(value)
        for value in [place_type, *raw_types]
    )

    combined_text = " ".join(
        (str(name), str(place_type), type_text)
    )

    # Remove unrelated businesses and generic bridges.
    if contains_term(
        combined_text,
        EXCLUDED_ATTRACTION_TERMS
    ):
        return False

    if contains_term(
        type_text,
        EXCLUDED_BUSINESS_TYPES
    ):
        return False

    # Keep listings that look like genuine visitor attractions.
    return (
        contains_term(type_text, ATTRACTION_TERMS)
        or contains_term(name, ATTRACTION_TERMS)
    )


def normalize_candidate(
    item,
    index,
    destination,
    category,
    center_lat,
    center_lon
):
    if not isinstance(item, dict) or not item.get("title"):
        return None

    coordinates = item.get("gps_coordinates") or {}

    latitude = parse_coordinate(
        coordinates.get("latitude")
    )
    longitude = parse_coordinate(
        coordinates.get("longitude")
    )

    # Coordinates are mandatory to enforce the selected hotel's radius.
    if latitude is None or longitude is None:
        return None

    if not -90 <= latitude <= 90:
        return None

    if not -180 <= longitude <= 180:
        return None

    distance_km = haversine_km(
        center_lat,
        center_lon,
        latitude,
        longitude
    )

    if distance_km > SEARCH_RADIUS_KM:
        return None

    try:
        rating = (
            float(item["rating"])
            if item.get("rating") is not None
            else None
        )
    except (TypeError, ValueError):
        rating = None

    reviews = parse_number(item.get("reviews"))
    address = item.get("address") or destination
    place_type = item.get("type") or category
    types = item.get("types") or []
    name = item["title"]

    map_query = quote_plus(f"{name}, {address}")

    maps_url = (
        "https://www.google.com/maps/search/?api=1"
        f"&query={map_query}"
    )

    common = {
        "id": str(
            item.get("place_id")
            or item.get("data_id")
            or f"{category.lower()}-{index}"
        ),
        "name": name,
        "rating": rating,
        "reviews": reviews,
        "address": address,
        "location": address,
        "description": item.get("description") or "",
        "image": safe_https_url(item.get("thumbnail")),
        "website": safe_https_url(item.get("website")),
        "phone": item.get("phone"),
        "mapsUrl": maps_url,
        "latitude": latitude,
        "longitude": longitude,
        "type": place_type,
        "distanceKm": round(distance_km, 2),
        "distance": (
            f"{distance_km:.1f} km away"
            if distance_km >= 1
            else f"{int(distance_km * 1000)} m away"
        ),
        "recommended": False,
    }

    if category == "Restaurant":
        return {
            **common,
            "priceLevel": item.get("price") or "Price unavailable",
            "cuisine": (
                " · ".join(types[:3])
                if types
                else place_type
            ),
            "mealEstimatePerPerson": get_meal_estimate(
                item.get("price")
            ),
        }

    searchable_type = f"{name} {place_type}".lower()

    if "beach" in searchable_type:
        emoji = "🏖️"
    elif "fort" in searchable_type or "palace" in searchable_type:
        emoji = "🏰"
    elif "temple" in searchable_type or "church" in searchable_type:
        emoji = "🛕"
    elif "museum" in searchable_type or "monument" in searchable_type:
        emoji = "🏛️"
    elif "park" in searchable_type or "garden" in searchable_type:
        emoji = "🌳"
    elif "waterfall" in searchable_type:
        emoji = "🌊"
    else:
        emoji = "📍"

    return {
        **common,
        "emoji": emoji,
    }


def choose_top_places(
    candidates,
    limit=MAX_RESULTS_PER_CATEGORY
):
    """
    Prefer places rated at least 4.0 with reviews.
    Relax the rating threshold when fewer results are available.
    """
    ranked = sorted(
        candidates,
        key=quality_score,
        reverse=True
    )

    tiers = [
        [
            place for place in ranked
            if (place.get("rating") or 0) >= 4.0
            and place.get("reviews", 0) >= 50
        ],
        [
            place for place in ranked
            if (place.get("rating") or 0) >= 4.0
        ],
        [
            place for place in ranked
            if (place.get("rating") or 0) >= 3.8
        ],
        ranked,
    ]

    selected = []
    seen = set()

    for tier in tiers:
        for place in tier:
            if place["id"] in seen:
                continue

            selected.append(place)
            seen.add(place["id"])

            if len(selected) >= limit:
                return selected

    return selected


# ============================================================
# SEARCH NEAR THE SELECTED HOTEL
# ============================================================

@discovery_bp.post("/search")
@cross_origin(origins=FRONTEND_ORIGIN)
def search_discovery():
    data = request.get_json(silent=True) or {}

    destination = str(
        data.get("destination", "")
    ).strip()

    hotel_name = str(
        data.get("hotelName", "")
    ).strip()

    hotel_latitude = parse_coordinate(
        data.get("hotelLatitude")
    )

    hotel_longitude = parse_coordinate(
        data.get("hotelLongitude")
    )

    if not destination:
        return jsonify({
            "error": "Destination is required."
        }), 400

    if (
        hotel_latitude is None
        or hotel_longitude is None
    ):
        return jsonify({
            "error": (
                "Select a hotel with valid coordinates "
                "before searching nearby places."
            )
        }), 400

    if not -90 <= hotel_latitude <= 90:
        return jsonify({
            "error": "The selected hotel's coordinates are invalid."
        }), 400

    if not -180 <= hotel_longitude <= 180:
        return jsonify({
            "error": "The selected hotel's coordinates are invalid."
        }), 400

    try:
        restaurant_results = get_maps_results(
            "restaurants near me",
            hotel_latitude,
            hotel_longitude
        )

        attraction_results = get_maps_results(
            "tourist attractions near me",
            hotel_latitude,
            hotel_longitude
        )

        restaurant_candidates = [
            place
            for index, item in enumerate(restaurant_results)
            if (
                place := normalize_candidate(
                    item,
                    index,
                    destination,
                    "Restaurant",
                    hotel_latitude,
                    hotel_longitude
                )
            ) is not None
        ]

        attraction_candidates = [
            place
            for index, item in enumerate(attraction_results)
            if is_tourist_attraction(item)
            and (
                place := normalize_candidate(
                    item,
                    index,
                    destination,
                    "Attraction",
                    hotel_latitude,
                    hotel_longitude
                )
            ) is not None
        ]

        restaurants = choose_top_places(
            restaurant_candidates
        )

        places = choose_top_places(
            attraction_candidates
        )

        # Highlight exactly one recommended restaurant.
        if restaurants:
            restaurants[0]["recommended"] = True

        return jsonify({
            "destination": destination,
            "hotelName": hotel_name or None,
            "hotelLatitude": hotel_latitude,
            "hotelLongitude": hotel_longitude,
            "radiusKm": SEARCH_RADIUS_KM,
            "restaurantCount": len(restaurants),
            "placeCount": len(places),
            "restaurants": restaurants,
            "places": places,
            "message": (
                None
                if restaurants or places
                else (
                    "No nearby restaurants or attractions with "
                    "usable location data were found within 5 km "
                    "of this hotel. Try another hotel."
                )
            ),
        }), 200

    except Exception as error:
        # Avoid logging request URLs that might expose an API key.
        print("Discovery search error:", error)

        return jsonify({
            "error": (
                "Unable to load nearby restaurants and "
                "attractions right now."
            )
        }), 502