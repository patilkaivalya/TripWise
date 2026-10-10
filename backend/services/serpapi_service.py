
import requests

from config import SERPAPI_API_KEY


SERPAPI_BASE_URL = "https://serpapi.com/search"


class SerpApiError(RuntimeError):
    """Safe, readable SerpApi error without exposing request URLs."""

    def __init__(self, message, status_code=None):
        self.status_code = status_code
        super().__init__(message)


def serpapi_search(params):
    """
    Common helper for calling SerpApi.

    Reads provider error messages before handling HTTP errors.
    Never includes the complete request URL in raised exceptions,
    because it contains the API key.
    """

    if not SERPAPI_API_KEY:
        raise SerpApiError(
            "SERPAPI_API_KEY is missing from the backend configuration."
        )

    request_params = {
        **params,
        "api_key": SERPAPI_API_KEY,
        "output": "json",
    }

    try:
        response = requests.get(
            SERPAPI_BASE_URL,
            params=request_params,
            timeout=30,
        )

    except requests.Timeout:
        raise SerpApiError(
            "The SerpApi request timed out. Please try again."
        ) from None

    except requests.RequestException:
        raise SerpApiError(
            "Could not connect to SerpApi. Check your network connection."
        ) from None

    # Read the response body before raising an HTTP error.
    try:
        data = response.json()

    except ValueError:
        if not response.ok:
            raise SerpApiError(
                f"SerpApi returned HTTP {response.status_code} "
                "without a readable JSON error message.",
                status_code=response.status_code,
            ) from None

        raise SerpApiError(
            "SerpApi returned an invalid JSON response."
        ) from None

    if not isinstance(data, dict):
        raise SerpApiError(
            "SerpApi returned an unexpected response format.",
            status_code=response.status_code,
        )

    # SerpApi normally provides a useful message in its JSON body.
    provider_error = data.get("error")

    if not response.ok:
        message = (
            str(provider_error)
            if provider_error
            else "No detailed error message was provided."
        )

        raise SerpApiError(
            f"HTTP {response.status_code}: {message}",
            status_code=response.status_code,
        )

    if provider_error:
        raise SerpApiError(str(provider_error))

    return data
