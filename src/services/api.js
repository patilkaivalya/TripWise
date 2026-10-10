
import axios from "axios";

// Vite exposes environment variables prefixed with VITE_ to the client.
// Local development falls back to the current Flask API address.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const API_BASE_URL = (
  configuredApiBaseUrl || "http://127.0.0.1:5000/api"
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

export const getLocationSuggestions = async (query) => {
  const response = await API.get("/locations/autocomplete", {
    params: { q: query },
  });

  return response.data?.suggestions || [];
};

export const getFlightLocationSuggestions = async (query) => {
  const response = await API.get("/flights/autocomplete", {
    params: { q: query },
  });

  return response.data?.suggestions || [];
};

export const searchFlights = async ({
  origin,
  destination,
  departureDate,
  returnDate,
  travellers,
}) => {
  const response = await API.post("/flights/search", {
    origin,
    destination,
    departureDate,
    returnDate,
    travellers,
  });

  return response.data;
};

export const getReturnFlights = async ({
  departureToken,
  travellers,
  origin,
  destination,
  departureDate,
  returnDate,
}) => {
  const response = await API.post("/flights/returns", {
    departureToken,
    travellers,
    origin,
    destination,
    departureDate,
    returnDate,
  });

  return response.data;
};

export const getBookingOptions = async ({
  bookingToken,
  origin,
  destination,
  departureDate,
  returnDate,
}) => {
  const response = await API.post("/flights/booking-options", {
    bookingToken,
    origin,
    destination,
    departureDate,
    returnDate,
  });

  return response.data;
};

export const searchHotels = async ({
  destination,
  checkInDate,
  checkOutDate,
  travellers,
}) => {
  const response = await API.post("/hotels/search", {
    destination,
    checkInDate,
    checkOutDate,
    travellers,
  });

  return response.data;
};

export const searchDiscovery = async ({
  destination,
  hotelName,
  hotelLatitude,
  hotelLongitude,
}) => {
  const response = await API.post("/discovery/search", {
    destination,
    hotelName,
    hotelLatitude,
    hotelLongitude,
  });

  return response.data;
};

export default API;
