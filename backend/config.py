import os

from dotenv import load_dotenv


load_dotenv()


SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

FRONTEND_URL = "http://localhost:5173"


if not SERPAPI_API_KEY:
    raise RuntimeError(
        "SERPAPI_API_KEY is missing. "
        "Add it to backend/.env."
    )