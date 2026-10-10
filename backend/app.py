
from flask import Flask, jsonify
from flask_cors import CORS

from routes.hotels import hotels_bp
from routes.flights import flights_bp
from routes.locations import locations_bp
from routes.discovery import discovery_bp


# ============================================================
# CREATE FLASK APPLICATION
# ============================================================

app = Flask(__name__)

# Enable CORS for frontend API requests during development.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)


# ============================================================
# REGISTER BLUEPRINTS
# ============================================================

app.register_blueprint(
    locations_bp,
    url_prefix="/api/locations"
)

app.register_blueprint(
    flights_bp,
    url_prefix="/api/flights"
)

app.register_blueprint(
    hotels_bp,
    url_prefix="/api/hotels"
)

app.register_blueprint(
    discovery_bp,
    url_prefix="/api/discovery"
)

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return jsonify({
        "status": "ok",
        "message": "TripWise backend is running."
    })


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
