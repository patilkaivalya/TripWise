from datetime import date

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from cors_config import FRONTEND_ORIGINS

from services.serpapi_service import serpapi_search


hotels_bp = Blueprint("hotels", __name__)

FRONTEND_ORIGIN = FRONTEND_ORIGINS[0] if FRONTEND_ORIGINS else "*"
MAX_HOTEL_TRAVELLERS = 6


def extract_hotel_image_urls(property_data):
    """Collect usable hotel photo URLs from common Google Hotels image fields."""
    urls = []
    seen = set()
    image_keys = {
        "thumbnail", "thumbnail_url", "thumbnailurl",
        "original_image", "originalimage", "original",
        "image", "image_url", "imageurl",
        "photo", "photo_url", "photourl",
        "src", "url", "content_url", "contenturl",
        "large", "medium", "small",
    }

    def add_url(value):
        if not isinstance(value, str):
            return
        candidate = value.strip()
        if candidate.startswith("//"):
            candidate = "https:" + candidate
        if not candidate.lower().startswith(("https://", "http://")):
            return
        if candidate not in seen:
            seen.add(candidate)
            urls.append(candidate)

    def walk(value, depth=0):
        if value is None or depth > 5:
            return
        if isinstance(value, str):
            add_url(value)
            return
        if isinstance(value, list):
            for item in value:
                walk(item, depth + 1)
            return
        if isinstance(value, dict):
            # Only recurse through known image-related keys so unrelated hotel
            # URLs (for example, booking links) cannot become photo sources.
            for key, nested in value.items():
                normalized_key = str(key).replace("-", "_").replace(" ", "_").lower()
                if normalized_key in image_keys:
                    walk(nested, depth + 1)

    # Prefer thumbnails for fast initial rendering, then try original images.
    add_url(property_data.get("thumbnail"))
    add_url(property_data.get("thumbnail_url"))
    walk(property_data.get("images") or [])
    walk(property_data.get("photos") or [])
    for key in ("image", "image_url", "photo", "photo_url", "original_image", "originalImage"):
        walk(property_data.get(key))

    return urls


# ============================================================
# HOTEL SEARCH
# ============================================================

@hotels_bp.post("/search")
@cross_origin(origins=FRONTEND_ORIGIN)
def search_hotels():
    data = request.get_json(silent=True) or {}

    destination = str(data.get("destination", "")).strip()
    check_in_date = str(data.get("checkInDate", "")).strip()
    check_out_date = str(data.get("checkOutDate", "")).strip()

    try:
        travellers = int(data.get("travellers", 1))
    except (TypeError, ValueError):
        travellers = 0

    # --------------------------------------------------------
    # Validate request before contacting the provider
    # --------------------------------------------------------
    if not destination:
        return jsonify({"error": "Destination is required."}), 400

    if not check_in_date or not check_out_date:
        return jsonify({
            "error": "Check-in and check-out dates are required."
        }), 400

    try:
        check_in = date.fromisoformat(check_in_date)
        check_out = date.fromisoformat(check_out_date)
    except ValueError:
        return jsonify({
            "error": "Dates must use YYYY-MM-DD format."
        }), 400

    if check_out <= check_in:
        return jsonify({
            "error": "Check-out date must be after check-in date."
        }), 400

    # Google Hotels via this provider supports at most six total travellers.
    # Do not silently clamp a larger group, because that would search for
    # fewer guests than the user actually entered.
    if not 1 <= travellers <= MAX_HOTEL_TRAVELLERS:
        return jsonify({
            "error": (
                "Hotel search supports 1 to 6 travellers per search. "
                "Please reduce the traveller count or search for multiple rooms."
            ),
            "maxTravellers": MAX_HOTEL_TRAVELLERS,
        }), 400

    nights = (check_out - check_in).days

    # Build the parameters once; use the same object for logging and search.
    params = {
        "engine": "google_hotels",
        "q": f"hotels in {destination}",
        "check_in_date": check_in_date,
        "check_out_date": check_out_date,
        "adults": travellers,
        "currency": "INR",
        "gl": "in",
        "hl": "en",
    }

    # Safe diagnostic logging: no API key is included in these parameters.
    print("Hotel search traveller count:", travellers)
    print("Hotel search parameters:", params)

    # --------------------------------------------------------
    # Search Google Hotels through SerpApi
    # --------------------------------------------------------
    try:
        provider_data = serpapi_search(params)
        raw_properties = provider_data.get("properties", []) or []
        hotels = []

        for index, property_data in enumerate(raw_properties):
            if not isinstance(property_data, dict):
                continue

            # Nightly rate
            rate = property_data.get("rate_per_night") or {}
            price_per_night = rate.get("extracted_lowest")

            if price_per_night is None:
                price_per_night = rate.get("extracted_before_taxes_fees")

            try:
                price_per_night = (
                    float(price_per_night)
                    if price_per_night is not None
                    else None
                )
            except (TypeError, ValueError):
                price_per_night = None

            # Rating and review count
            rating = property_data.get("overall_rating")
            reviews = property_data.get("reviews", 0)

            try:
                rating = float(rating) if rating is not None else None
            except (TypeError, ValueError):
                rating = None

            try:
                reviews = int(reviews or 0)
            except (TypeError, ValueError):
                reviews = 0

            # Keep multiple provider photo URLs so the frontend can fall back
            # if a thumbnail is expired, blocked, or fails to load.
            image_candidates = extract_hotel_image_urls(property_data)
            image_url = image_candidates[0] if image_candidates else None

            # Coordinates
            coordinates = property_data.get("gps_coordinates") or {}

            # Amenities
            amenities = property_data.get("amenities") or []

            # Only expose regular HTTPS property links.
            link = property_data.get("link")
            if not isinstance(link, str) or not link.startswith("https://"):
                link = None

            hotels.append({
                "id": str(
                    property_data.get("property_token") or f"hotel-{index}"
                ),
                "name": property_data.get("name") or "Hotel name unavailable",
                "rating": rating,
                "reviews": reviews,
                "location": property_data.get("address") or destination,
                "description": property_data.get("description"),
                "pricePerNight": price_per_night,
                "currency": "INR",
                "totalPrice": (
                    price_per_night * nights
                    if price_per_night is not None
                    else None
                ),
                "image": image_url,
                "imageCandidates": image_candidates,
                "amenities": amenities[:10],
                "phone": property_data.get("phone"),
                "bookingUrl": link,
                "propertyToken": property_data.get("property_token"),
                "latitude": coordinates.get("latitude"),
                "longitude": coordinates.get("longitude"),
                "hotelClass": property_data.get("hotel_class"),
                "recommended": index == 0,
            })

        return jsonify({
            "destination": destination,
            "checkInDate": check_in_date,
            "checkOutDate": check_out_date,
            "nights": nights,
            "travellers": travellers,
            "hotelCount": len(hotels),
            "hotels": hotels,
            "message": (
                None
                if hotels
                else (
                    "No hotels were found for these dates. "
                    "Try another destination or different dates."
                )
            ),
        }), 200

    except Exception as error:
        # Avoid logging the full request URL or any API key.
        print("Hotel search error:", error)
        return jsonify({
            "error": "Unable to search hotels right now.",
            "details": str(error),
        }), 502
