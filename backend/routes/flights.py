from datetime import date

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from cors_config import FRONTEND_ORIGINS

from services.serpapi_service import serpapi_search


flights_bp = Blueprint("flights", __name__)
FRONTEND_ORIGIN = FRONTEND_ORIGINS[0] if FRONTEND_ORIGINS else "*"


# ============================================================
# HELPERS
# ============================================================

def normalize_location_id(value):
    """Keep Google location IDs intact and uppercase airport codes."""
    value = str(value or "").strip()
    if value.startswith(("/m/", "/g/")):
        return value
    return value.upper()


def parse_travellers(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_raw_flights(data):
    return (data.get("best_flights", []) or []) + (
        data.get("other_flights", []) or []
    )


def is_no_results_error(error):
    message = str(error).lower()
    return (
        "hasn't returned any results" in message
        or "no flights found" in message
        or "no results found" in message
    )


def search_google_flights(params, fallback_params=None):
    """Try standard and deep searches, optionally using fallback city IDs."""
    candidates = [params]
    if fallback_params:
        candidates.append(fallback_params)

    attempts = []
    seen = set()

    for candidate in candidates:
        for deep_search in ("false", "true"):
            attempt = {**candidate, "deep_search": deep_search}
            signature = tuple(sorted((key, str(value)) for key, value in attempt.items()))
            if signature not in seen:
                attempts.append(attempt)
                seen.add(signature)

    for attempt in attempts:
        try:
            result = serpapi_search(attempt)
        except Exception as error:
            if is_no_results_error(error):
                continue
            raise

        if not isinstance(result, dict):
            raise RuntimeError("The flight provider returned an invalid response.")

        provider_error = result.get("error")
        if provider_error:
            if is_no_results_error(provider_error):
                continue
            raise RuntimeError(str(provider_error))

        if get_raw_flights(result):
            return result, False

    return {"best_flights": [], "other_flights": []}, True


def normalize_flights(raw_flights, return_flights=False):
    """Convert SerpApi flight results to the frontend response format."""
    flights = []

    for index, option in enumerate(raw_flights):
        segments = []

        for flight in option.get("flights", []):
            departure_airport = flight.get("departure_airport") or {}
            arrival_airport = flight.get("arrival_airport") or {}

            segments.append({
                "flightNumber": flight.get("flight_number"),
                "airline": flight.get("airline"),
                "airlineLogo": flight.get("airline_logo"),
                "departure": {
                    "airport": departure_airport.get("name"),
                    "iataCode": departure_airport.get("id"),
                    "time": departure_airport.get("time"),
                },
                "arrival": {
                    "airport": arrival_airport.get("name"),
                    "iataCode": arrival_airport.get("id"),
                    "time": arrival_airport.get("time"),
                },
                "duration": flight.get("duration"),
                "travelClass": flight.get("travel_class"),
                "airplane": flight.get("airplane"),
                "legroom": flight.get("legroom"),
                "extensions": flight.get("extensions", []),
            })

        normalized = {
            "id": f"return-{index}" if return_flights else index,
            "segments": segments,
            "totalDuration": option.get("total_duration"),
            "price": option.get("price"),
            "currency": "INR",
            "type": option.get("type"),
            "airlineLogo": option.get("airline_logo"),
            "extensions": option.get("extensions", []),
        }

        if return_flights:
            normalized["bookingToken"] = option.get("booking_token")
        else:
            normalized["departureToken"] = option.get("departure_token")

        flights.append(normalized)

    return flights


def validate_dates(departure_date, return_date):
    """Validate ISO-format dates and ensure the return is not earlier."""
    try:
        departure = date.fromisoformat(departure_date)
        returning = date.fromisoformat(return_date)
    except (TypeError, ValueError):
        return "Dates must use YYYY-MM-DD format."

    if returning < departure:
        return "Return date cannot be earlier than departure date."

    return None


def empty_results_message():
    return "No flights were found for this route and date. Try different dates or a nearby airport."


# ============================================================
# GOOGLE FLIGHTS AUTOCOMPLETE
# ============================================================

@flights_bp.get("/autocomplete")
@cross_origin(origins=FRONTEND_ORIGIN)
def flight_autocomplete():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({"suggestions": []})

    try:
        data = serpapi_search({
            "engine": "google_flights_autocomplete",
            "q": query,
            "hl": "en",
            "gl": "in",
        })

        if data.get("error"):
            return jsonify({
                "error": "Unable to resolve flight location.",
                "details": data["error"],
            }), 502

        suggestions = []
        for item in data.get("suggestions", []):
            airports = []
            for airport in item.get("airports", []):
                airports.append({
                    "name": airport.get("name"),
                    "iataCode": airport.get("id"),
                    "city": airport.get("city"),
                    "cityId": airport.get("city_id"),
                    "distance": airport.get("distance"),
                })

            suggestions.append({
                "name": item.get("name"),
                "type": item.get("type"),
                "description": item.get("description"),
                "flightLocationId": item.get("id"),
                "airports": airports,
            })

        return jsonify({"query": query, "suggestions": suggestions})

    except Exception as error:
        print("Flight autocomplete error:", error)
        return jsonify({"error": "Unable to resolve flight location."}), 502


# ============================================================
# SEARCH OUTBOUND FLIGHTS
# ============================================================

@flights_bp.post("/search")
@cross_origin(origins=FRONTEND_ORIGIN)
def flight_search():
    data = request.get_json(silent=True) or {}

    origin = normalize_location_id(data.get("origin"))
    destination = normalize_location_id(data.get("destination"))
    departure_date = str(data.get("departureDate", "")).strip()
    return_date = str(data.get("returnDate", "")).strip()
    travellers = parse_travellers(data.get("travellers", 1))

    origin_city_id = normalize_location_id(data.get("originCityId"))
    destination_city_id = normalize_location_id(data.get("destinationCityId"))

    if not origin:
        return jsonify({"error": "Origin is required."}), 400
    if not destination:
        return jsonify({"error": "Destination is required."}), 400
    if not departure_date or not return_date:
        return jsonify({"error": "Departure date and return date are required."}), 400
    if travellers is None or not 1 <= travellers <= 20:
        return jsonify({"error": "Travellers must be a whole number between 1 and 20."}), 400
    if origin == destination:
        return jsonify({"error": "Origin and destination cannot be the same."}), 400

    date_error = validate_dates(departure_date, return_date)
    if date_error:
        return jsonify({"error": date_error}), 400

    primary_params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": destination,
        "type": "1",
        "outbound_date": departure_date,
        "return_date": return_date,
        "adults": travellers,
        "travel_class": "1",
        "currency": "INR",
        "gl": "in",
        "hl": "en",
    }

    fallback_params = None
    if origin_city_id or destination_city_id:
        fallback_origin = origin_city_id or origin
        fallback_destination = destination_city_id or destination
        if fallback_origin != origin or fallback_destination != destination:
            fallback_params = {
                **primary_params,
                "departure_id": fallback_origin,
                "arrival_id": fallback_destination,
            }

    try:
        flight_data, no_results = search_google_flights(primary_params, fallback_params)
        flights = normalize_flights(get_raw_flights(flight_data))

        response = {
            "origin": origin,
            "destination": destination,
            "departureDate": departure_date,
            "returnDate": return_date,
            "travellers": travellers,
            "flightCount": len(flights),
            "flights": flights,
        }
        if no_results or not flights:
            response["message"] = empty_results_message()

        return jsonify(response), 200

    except Exception as error:
        print("Google Flights search error:", error)
        return jsonify({
            "error": "The flight search provider is temporarily unavailable.",
        }), 502


# ============================================================
# GET RETURN FLIGHTS
# ============================================================

@flights_bp.post("/returns")
@cross_origin(origins=FRONTEND_ORIGIN)
def return_flights():
    data = request.get_json(silent=True) or {}

    departure_token = str(data.get("departureToken", "")).strip()
    origin = normalize_location_id(data.get("origin"))
    destination = normalize_location_id(data.get("destination"))
    departure_date = str(data.get("departureDate", "")).strip()
    return_date = str(data.get("returnDate", "")).strip()
    travellers = parse_travellers(data.get("travellers", 1))

    if not departure_token:
        return jsonify({"error": "Departure token is required."}), 400
    if not origin or not destination:
        return jsonify({"error": "Origin and destination are required."}), 400
    if not departure_date or not return_date:
        return jsonify({"error": "Departure date and return date are required."}), 400
    if travellers is None or not 1 <= travellers <= 20:
        return jsonify({"error": "Travellers must be a whole number between 1 and 20."}), 400

    date_error = validate_dates(departure_date, return_date)
    if date_error:
        return jsonify({"error": date_error}), 400

    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": destination,
        "type": "1",
        "outbound_date": departure_date,
        "return_date": return_date,
        "departure_token": departure_token,
        "adults": travellers,
        "travel_class": "1",
        "currency": "INR",
        "gl": "in",
        "hl": "en",
    }

    try:
        flight_data, no_results = search_google_flights(params)
        flights = normalize_flights(get_raw_flights(flight_data), return_flights=True)

        response = {"flightCount": len(flights), "flights": flights}
        if no_results or not flights:
            response["message"] = (
                "No return flight options were found for this selection. "
                "Please select another outbound flight."
            )
        return jsonify(response), 200

    except Exception as error:
        print("Return flights search error:", error)
        return jsonify({
            "error": "The return-flight search provider is temporarily unavailable. Please try again."
        }), 502


# ============================================================
# FLIGHT BOOKING OPTIONS
# ============================================================

@flights_bp.post("/booking-options")
@cross_origin(origins=FRONTEND_ORIGIN)
def flight_booking_options():
    data = request.get_json(silent=True) or {}

    booking_token = str(data.get("bookingToken", "")).strip()
    origin = normalize_location_id(data.get("origin"))
    destination = normalize_location_id(data.get("destination"))
    departure_date = str(data.get("departureDate", "")).strip()
    return_date = str(data.get("returnDate", "")).strip()

    if not booking_token:
        return jsonify({
            "error": "Booking token is required. Please select a return flight again."
        }), 400
    if not origin or not destination:
        return jsonify({"error": "Origin and destination are required."}), 400
    if not departure_date or not return_date:
        return jsonify({"error": "Departure and return dates are required."}), 400

    date_error = validate_dates(departure_date, return_date)
    if date_error:
        return jsonify({"error": date_error}), 400

    # These variables are deliberately read and validated ABOVE the API call.
    # Booking-token requests still include the original trip route and dates,
    # as required by the provider response seen in this app's requests.
    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": destination,
        "type": "1",
        "outbound_date": departure_date,
        "return_date": return_date,
        "booking_token": booking_token,
        "currency": "INR",
        "gl": "in",
        "hl": "en",
    }

    try:
        provider_data = serpapi_search(params)

        raw_options = provider_data.get("booking_options", []) or []
        currency = (
            provider_data.get("search_parameters", {}).get("currency")
            or "INR"
        )
        booking_options = []

        for index, parent in enumerate(raw_options):
            if not isinstance(parent, dict):
                continue

            separate_tickets = bool(parent.get("separate_tickets"))
            groups = []
            together = parent.get("together")

            if isinstance(together, dict):
                groups.append(("itinerary", together))
            elif parent.get("book_with") or parent.get("booking_request"):
                groups.append(("itinerary", parent))

            # Some responses expose separate actions for each leg.
            for leg_name in ("departing", "returning"):
                group = parent.get(leg_name)
                if isinstance(group, dict) and (separate_tickets or not groups):
                    leg = "outbound" if leg_name == "departing" else "return"
                    groups.append((leg, group))

            for group_index, (leg, group) in enumerate(groups):
                request_info = (
                    group.get("booking_request")
                    or parent.get("booking_request")
                    or {}
                )
                raw_url = request_info.get("url")
                if not isinstance(raw_url, str) or not raw_url.startswith("https://"):
                    raw_url = None

                post_data = request_info.get("post_data")
                if not isinstance(post_data, str):
                    post_data = None

                booking_request = (
                    {"url": raw_url, "postData": post_data}
                    if raw_url
                    else None
                )

                if leg == "outbound":
                    note = "Outbound ticket only. The return ticket must be booked separately."
                elif leg == "return":
                    note = "Return ticket only. The outbound ticket must be booked separately."
                elif separate_tickets:
                    note = (
                        "Separate tickets may be involved. Verify the itinerary "
                        "and final price before paying."
                    )
                else:
                    note = "Booking option for the selected itinerary. Verify final details with the seller."

                price = group.get("price")
                if price is None and leg == "itinerary":
                    price = parent.get("price")

                booking_options.append({
                    "id": f"{index}-{group_index}-{leg}",
                    "seller": group.get("book_with") or "Booking provider",
                    "price": price,
                    "currency": currency,
                    "leg": leg,
                    "note": note,
                    "separateTickets": separate_tickets,
                    "bookingRequest": booking_request,
                })

        response = {"bookingOptions": booking_options}
        if not booking_options:
            response["message"] = (
                "No booking options were returned for this itinerary. "
                "Try another return flight."
            )
        return jsonify(response), 200

    except Exception as error:
        # The shared helper should avoid printing request URLs/API keys.
        print("Flight booking options error:", error)
        return jsonify({
            "error": "Unable to load booking options right now. Please try again."
        }), 502
