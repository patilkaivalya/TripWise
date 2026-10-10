import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

export const getLocationSuggestions = async (query) => {
  console.log("Calling location API:", query);

  const response = await API.get("/locations/autocomplete", {
    params: { q: query },
  });

  console.log("Location API response:", response.data);
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