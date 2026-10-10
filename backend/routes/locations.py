from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from cors_config import FRONTEND_ORIGINS

from services.serpapi_service import serpapi_search


locations_bp = Blueprint("locations", __name__)


@locations_bp.get("/autocomplete")
@cross_origin(origins=FRONTEND_ORIGINS)
def autocomplete():
    """
    GET /api/locations/autocomplete?q=Mumbai

    Optional:
    lat
    lon
    zoom
    """

    query = request.args.get("q", "").strip()

    if len(query) < 2:
        return jsonify({
            "suggestions": []
        })


    try:
        latitude = float(
            request.args.get("lat", 19.0760)
        )

        longitude = float(
            request.args.get("lon", 72.8777)
        )

        zoom = request.args.get("zoom", "12")

    except ValueError:
        return jsonify({
            "error": "Invalid latitude or longitude."
        }), 400


    # SerpApi Google Maps Autocomplete requires ll.
    ll = f"@{latitude},{longitude},{zoom}z"


    data = serpapi_search({
        "engine": "google_maps_autocomplete",
        "q": query,
        "ll": ll,
        "gl": "in",
        "hl": "en",
    })


    suggestions = []


    for item in data.get("suggestions", []):

        # We only want actual places,
        # not generic keyword suggestions.
        if item.get("type") != "place":
            continue


        suggestion = {
            "name": item.get("value"),
            "address": item.get("subtext"),
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "dataId": item.get("data_id"),
            "type": item.get("type"),
            "mapsUrl": item.get("maps_serpapi_link"),
        }

        suggestions.append(suggestion)


    return jsonify({
        "suggestions": suggestions
    })