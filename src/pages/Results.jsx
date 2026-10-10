import { useEffect, useMemo, useState } from "react";

import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    MapPin,
    Phone,
    Plane,
    RefreshCw,
    Star,
    Users,
    X,
} from "lucide-react";

import FlightOptionCard from "../components/FlightOptionCard";
import TripCart from "../components/TripCart";
import HotelSelection from "../components/HotelSelection";
import HotelPhoto from "../components/HotelPhoto";
import DiscoverySelection from "../components/DiscoverySelection";
import BudgetBreakdown from "../components/BudgetBreakdown";
import FinalItinerary from "../components/FinalItinerary";

import {
    searchFlights,
    getReturnFlights,
    getBookingOptions,
    searchHotels,
    searchDiscovery,
} from "../services/api";

import {
    calculateFoodEstimate,
    calculateTransportEstimate,
    calculateActivityEstimate,
} from "../utils/budgetCalculator";

/* Nearby restaurants and attractions are loaded from the discovery API. */

function formatFlightTime(time) {
    if (!time) {
        return "--";
    }

    const date = new Date(time.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return time;
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "numeric",
            minute: "2-digit",
        }
    );
}


function formatDuration(minutes) {
    if (!minutes) {
        return "--";
    }

    const hours = Math.floor(
        minutes / 60
    );

    const remainingMinutes =
        minutes % 60;

    if (hours === 0) {
        return `${remainingMinutes}m`;
    }

    return `${hours}h ${remainingMinutes}m`;
}


function normalizeFlight(flight, id) {
    const segments =
        flight.segments || [];

    const firstSegment =
        segments[0];

    const lastSegment =
        segments[segments.length - 1];

    return {
        id,

        airline:
            firstSegment?.airline ||
            "Multiple airlines",

        airlineLogo:
            firstSegment?.airlineLogo ||
            null,

        flightNumber:
            firstSegment?.flightNumber ||
            "—",

        departureTime:
            formatFlightTime(
                firstSegment?.departure?.time
            ),

        arrivalTime:
            formatFlightTime(
                lastSegment?.arrival?.time
            ),

        departureCode:
            firstSegment?.departure?.iataCode ||
            "—",

        arrivalCode:
            lastSegment?.arrival?.iataCode ||
            "—",

        duration:
            formatDuration(
                flight.totalDuration
            ),

        stops: Math.max(
            segments.length - 1,
            0
        ),

        price:
            Number(flight.price) || 0,

        recommended:
            id.endsWith("-0"),

        departureToken:
            flight.departureToken ||
            null,

        bookingToken:
            flight.bookingToken ||
            null,

        rawFlight:
            flight,
    };
}


function getDateDifferenceDays(startDate, endDate) {
    if (!startDate || !endDate) {
        return null;
    }

    // Parse date-only values as UTC midnight so browser time zones do not
    // shift the number of days or nights by one.
    const start = Date.parse(`${String(startDate).slice(0, 10)}T00:00:00Z`);
    const end = Date.parse(`${String(endDate).slice(0, 10)}T00:00:00Z`);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        return null;
    }

    return Math.round((end - start) / 86400000);
}

function getTripNights(checkInDate, checkOutDate) {
    const difference = getDateDifferenceDays(checkInDate, checkOutDate);

    // A normal hotel stay uses the difference between check-in and checkout.
    // Keep a one-night fallback for incomplete/invalid date inputs.
    return difference === null ? 1 : Math.max(1, difference);
}

function getTripDays(startDate, endDate) {
    const difference = getDateDifferenceDays(startDate, endDate);

    // Count both the departure and return dates for daily food estimates.
    // If dates are temporarily unavailable, use one estimate day as a fallback.
    return difference === null ? 1 : difference + 1;
}

function getHotelImageCandidates(hotel) {
    const candidates = [
        // Preserve the list returned by the backend before trying legacy fields.
        ...(Array.isArray(hotel?.imageCandidates) ? hotel.imageCandidates : []),
        hotel?.image,
        hotel?.thumbnail,
        hotel?.imageUrl,
        hotel?.image_url,
        hotel?.photoUrl,
        hotel?.photo_url,
        hotel?.coverPhoto,
        hotel?.cover_photo,
        hotel?.primaryImage,
        hotel?.primary_image,
        ...(Array.isArray(hotel?.images)
            ? hotel.images.flatMap((item) => typeof item === "string"
                ? [item]
                : [item?.original_image, item?.originalImage, item?.thumbnail, item?.image, item?.url])
            : []),
        ...(Array.isArray(hotel?.photos)
            ? hotel.photos.flatMap((item) => typeof item === "string"
                ? [item]
                : [item?.original_image, item?.originalImage, item?.thumbnail, item?.image, item?.url])
            : []),
    ];

    const result = [];
    const seen = new Set();

    for (const candidate of candidates) {
        if (typeof candidate !== "string") continue;
        let value = candidate.trim();
        if (!value) continue;
        if (value.startsWith("//")) value = `https:${value}`;
        if (!/^https?:\/\//i.test(value)) continue;
        try {
            const safeUrl = new URL(value).href;
            if (!seen.has(safeUrl)) {
                seen.add(safeUrl);
                result.push(safeUrl);
            }
        } catch {
            // Ignore malformed provider image URLs.
        }
    }

    return result;
}

function normalizeHotel(hotel, index, destination) {
    const rawPrice = hotel?.pricePerNight;
    const parsedPrice = rawPrice === null || rawPrice === undefined || rawPrice === ""
        ? null
        : Number(rawPrice);

    const pricePerNight = Number.isFinite(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : null;

    const rawBookingUrl = hotel?.bookingUrl;
    let bookingUrl = null;

    if (typeof rawBookingUrl === "string") {
        try {
            const parsedUrl = new URL(rawBookingUrl);
            if (parsedUrl.protocol === "https:") {
                bookingUrl = parsedUrl.href;
            }
        } catch {
            bookingUrl = null;
        }
    }

    const amenities = Array.isArray(hotel?.amenities)
        ? hotel.amenities
            .map((item) => {
                if (typeof item === "string") return item;
                return item?.name || item?.title || null;
            })
            .filter(Boolean)
            .slice(0, 10)
        : [];

    const ratingValue = hotel?.rating === null || hotel?.rating === undefined
        ? null
        : Number(hotel.rating);

    const reviewsValue = Number(hotel?.reviews);

    return {
        ...hotel,
        id: String(hotel?.id || hotel?.propertyToken || `hotel-${index}`),
        name: hotel?.name || "Hotel name unavailable",
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        reviews: Number.isFinite(reviewsValue) ? reviewsValue : 0,
        location: hotel?.address || hotel?.location || destination,
        pricePerNight,
        imageCandidates: getHotelImageCandidates(hotel),
        image: getHotelImageCandidates(hotel)[0] || null,
        amenities,
        phone: hotel?.phone || null,
        bookingUrl,
        description: hotel?.description || null,
        recommended: Boolean(hotel?.recommended),
    };
}

/* =========================================================
   RESULTS PAGE
========================================================= */

function Results() {
    // Read the saved trip once. Invalid or missing session data is handled
    // by the empty-trip screen below instead of crashing the page.
    const [trip] = useState(() => {
        try {
            const storedTrip = sessionStorage.getItem("tripwiseTrip");
            return storedTrip ? JSON.parse(storedTrip) : null;
        } catch (error) {
            console.error("Unable to read saved trip:", error);
            return null;
        }
    });

    const [step, setStep] = useState("outbound");

    const [selectedOutbound, setSelectedOutbound] =
        useState(null);

    const [selectedReturn, setSelectedReturn] =
        useState(null);

    const [outboundFlights, setOutboundFlights] =
        useState([]);

    const [returnFlights, setReturnFlights] =
        useState([]);

    const [flightLoading, setFlightLoading] =
        useState(false);

    const [flightError, setFlightError] =
        useState("");

    const [flightMessage, setFlightMessage] =
        useState("");

    const [outboundRetryCount, setOutboundRetryCount] =
        useState(0);

    const [selectedHotel, setSelectedHotel] =
        useState(null);

    const [hotels, setHotels] = useState([]);
    const [hotelLoading, setHotelLoading] = useState(false);
    const [hotelError, setHotelError] = useState("");
    const [hotelMessage, setHotelMessage] = useState("");
    const [hotelRetryCount, setHotelRetryCount] = useState(0);

    const [restaurants, setRestaurants] = useState([]);
    const [places, setPlaces] = useState([]);
    const [discoveryLoading, setDiscoveryLoading] = useState(false);
    const [discoveryError, setDiscoveryError] = useState("");
    const [discoveryMessage, setDiscoveryMessage] = useState("");
    const [discoveryRetryCount, setDiscoveryRetryCount] = useState(0);

    const [selectedRestaurants, setSelectedRestaurants] =
        useState([]);

    const [selectedPlaces, setSelectedPlaces] =
        useState([]);

    const [showBookingOptions, setShowBookingOptions] =
        useState(false);

    const [showHotelDetails, setShowHotelDetails] =
        useState(null);



    useEffect(() => {
        if (!trip) {
            return;
        }

        if (
            !trip?.flightOrigin?.iataCode ||
            !trip?.flightDestination?.iataCode
        ) {
            setFlightError(
                "Trip information is missing flight airport details. Please start a new trip and select both locations."
            );
            setFlightLoading(false);
            return;
        }

        let cancelled = false;

        const loadOutboundFlights = async () => {
            try {
                setFlightLoading(true);
                setFlightError("");
                setFlightMessage("");
                setOutboundFlights([]);

                console.log("Searching real flights:", {
                    origin: trip.flightOrigin.iataCode,
                    destination: trip.flightDestination.iataCode,
                    departureDate: trip.departure,
                    returnDate: trip.returnDate,
                    travellers: trip.travellers,
                });

                const result = await searchFlights({
                    origin: trip.flightOrigin.iataCode,
                    destination: trip.flightDestination.iataCode,
                    departureDate: trip.departure,
                    returnDate: trip.returnDate,
                    travellers: trip.travellers,
                });

                console.log("REAL FLIGHT RESULTS:", result);

                const normalizedFlights = (result?.flights || []).map(
                    (flight, index) =>
                        normalizeFlight(flight, `outbound-${index}`)
                );

                if (cancelled) return;

                setOutboundFlights(normalizedFlights);
                setFlightMessage(
                    normalizedFlights.length === 0
                        ? result?.message ||
                        "No flights were found for this route and date. Try different dates or a nearby airport."
                        : ""
                );
            } catch (error) {
                console.error("Real flight search failed:", error);

                if (cancelled) return;

                setOutboundFlights([]);
                setFlightMessage("");
                setFlightError(
                    error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    "Unable to load flights right now. Check your connection and try again."
                );
            } finally {
                if (!cancelled) {
                    setFlightLoading(false);
                }
            }
        };

        loadOutboundFlights();

        return () => {
            cancelled = true;
        };
    }, [trip, outboundRetryCount]);


    /* ---------------------------------------------------------
       Load real hotels for the selected destination and dates
    --------------------------------------------------------- */

    useEffect(() => {
        if (!trip || step !== "hotel") {
            return;
        }

        let cancelled = false;

        const loadHotels = async () => {
            setHotelLoading(true);
            setHotelError("");
            setHotelMessage("");
            setHotels([]);

            try {
                const result = await searchHotels({
                    destination: trip.destination,
                    checkInDate: trip.departure,
                    checkOutDate: trip.returnDate,
                    travellers: trip.travellers,
                });

                if (cancelled) return;

                const returnedHotels = Array.isArray(result?.hotels)
                    ? result.hotels
                    : [];

                // HotelSelection and the budget calculator require a numeric
                // nightly price, so do not offer listings without a usable rate.
                const normalizedHotels = returnedHotels
                    .map((hotel, index) => normalizeHotel(
                        hotel,
                        index,
                        trip.destination
                    ))
                    .filter((hotel) => hotel && hotel.pricePerNight !== null);

                setHotels(normalizedHotels);

                if (normalizedHotels.length === 0) {
                    setHotelMessage(
                        returnedHotels.length > 0
                            ? "Hotels were returned, but none had a usable nightly price for these dates. Try different dates."
                            : result?.message || "No hotels were found for these dates. Try another destination or different dates."
                    );
                }
            } catch (error) {
                if (cancelled) return;

                console.error("Hotel search failed:", error);
                setHotels([]);
                setHotelMessage("");
                setHotelError(
                    error?.response?.data?.error ||
                    "Unable to load hotels right now. Check your connection and try again."
                );
            } finally {
                if (!cancelled) {
                    setHotelLoading(false);
                }
            }
        };

        loadHotels();

        return () => {
            cancelled = true;
        };
    }, [step, trip, hotelRetryCount]);


    /* ---------------------------------------------------------
       Load nearby restaurants and attractions around selected hotel
    --------------------------------------------------------- */

    useEffect(() => {
        if (!trip || step !== "discovery") {
            return;
        }

        if (!selectedHotel) {
            setRestaurants([]);
            setPlaces([]);
            setDiscoveryError("Please select a hotel before searching for nearby places.");
            setDiscoveryMessage("");
            setDiscoveryLoading(false);
            return;
        }

        const hotelLatitude = Number(selectedHotel.latitude);
        const hotelLongitude = Number(selectedHotel.longitude);

        if (!Number.isFinite(hotelLatitude) || !Number.isFinite(hotelLongitude)) {
            setRestaurants([]);
            setPlaces([]);
            setDiscoveryError(
                "This hotel does not have usable map coordinates. Please select another hotel to find nearby restaurants and attractions."
            );
            setDiscoveryMessage("");
            setDiscoveryLoading(false);
            return;
        }

        let cancelled = false;

        const loadNearbyDiscovery = async () => {
            setDiscoveryLoading(true);
            setDiscoveryError("");
            setDiscoveryMessage("");
            setRestaurants([]);
            setPlaces([]);

            try {
                const result = await searchDiscovery({
                    destination: trip.destination,
                    hotelName: selectedHotel.name,
                    hotelLatitude,
                    hotelLongitude,
                });

                if (cancelled) return;

                const rawRestaurants = Array.isArray(result?.restaurants)
                    ? result.restaurants
                    : [];
                const rawPlaces = Array.isArray(result?.places)
                    ? result.places
                    : [];

                // Keep the data shape expected by the existing restaurant card
                // and budget calculator. The backend already ranks by distance,
                // ratings and review count, and marks the top restaurant.
                const normalizedRestaurants = rawRestaurants.map((restaurant, index) => {
                    const mealEstimate = Number(restaurant?.mealEstimatePerPerson);

                    return {
                        ...restaurant,
                        id: String(restaurant?.id || `restaurant-${index}`),
                        location: restaurant?.address || restaurant?.location || trip.destination,
                        distance: restaurant?.distance || "Distance unavailable",
                        priceLevel: restaurant?.priceLevel || "Price unavailable",
                        cuisine: restaurant?.cuisine || restaurant?.type || "Restaurant",
                        mealEstimatePerPerson: Number.isFinite(mealEstimate) && mealEstimate > 0
                            ? mealEstimate
                            : 350,
                        recommended: index === 0,
                    };
                });

                const normalizedPlaces = rawPlaces.map((place, index) => ({
                    ...place,
                    id: String(place?.id || `place-${index}`),
                    location: place?.address || place?.location || trip.destination,
                    distance: place?.distance || "Distance unavailable",
                    description: place?.description || place?.address || "Nearby place to explore.",
                    emoji: place?.emoji || "📍",
                    recommended: Boolean(place?.recommended),
                }));

                setRestaurants(normalizedRestaurants);
                setPlaces(normalizedPlaces);

                if (normalizedRestaurants.length === 0 && normalizedPlaces.length === 0) {
                    setDiscoveryMessage(
                        result?.message ||
                        "No suitable nearby restaurants or attractions were found. Try selecting another hotel."
                    );
                }
            } catch (error) {
                if (cancelled) return;

                console.error("Nearby discovery search failed:", error);
                setRestaurants([]);
                setPlaces([]);
                setDiscoveryMessage("");
                setDiscoveryError(
                    error?.response?.data?.error ||
                    "Unable to load nearby restaurants and attractions. Please try again."
                );
            } finally {
                if (!cancelled) {
                    setDiscoveryLoading(false);
                }
            }
        };

        loadNearbyDiscovery();

        return () => {
            cancelled = true;
        };
    }, [step, trip, selectedHotel, discoveryRetryCount]);


    /* ---------------------------------------------------------
       Current flight list
    --------------------------------------------------------- */

    const currentFlights =
        step === "outbound"
            ? outboundFlights
            : returnFlights;

    /* ---------------------------------------------------------
       Currently selected flight
    --------------------------------------------------------- */

    const selectedFlight =
        step === "outbound"
            ? selectedOutbound
            : selectedReturn;

    /* ---------------------------------------------------------
       Flight heading
    --------------------------------------------------------- */

    const sectionTitle =
        step === "outbound"
            ? "Choose your departure flight"
            : "Choose your return flight";

    const sectionDescription =
        step === "outbound"
            ? `Flying from ${trip.from} to ${trip.destination} on ${trip.departure}.`
            : `Flying from ${trip.destination} to ${trip.from} on ${trip.returnDate}.`;

    /* ---------------------------------------------------------
       Progress
    --------------------------------------------------------- */

    const progress = useMemo(() => {
        if (step === "itinerary") return 100;
        if (step === "budget") return 83;
        if (step === "discovery") return 66;
        if (selectedHotel) return 50;
        if (selectedReturn) return 33;
        if (selectedOutbound) return 16;

        return 0;
    }, [
        step,
        selectedOutbound,
        selectedReturn,
        selectedHotel,
    ]);

    /* ---------------------------------------------------------
       Flight total
    --------------------------------------------------------- */

    const totalFlightCost =
        selectedReturn?.price ??
        selectedOutbound?.price ??
        0;

    // All hooks above this point run consistently, even without a saved trip.
    if (!trip) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">
                        No trip found
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Please start a new trip from the home page.
                    </p>
                    <a href="/" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                        Start New Trip
                    </a>
                </div>
            </div>
        );
    }

    const tripNights = getTripNights(
        trip.departure,
        trip.returnDate
    );

    // Hotel cost uses nights; per-day expenses use every calendar travel day.
    // Example: 29 Oct–4 Nov = 6 hotel nights and 7 food-estimate days.
    const tripDays = getTripDays(trip.departure, trip.returnDate);

    const hotelCost = selectedHotel
        ? (Number(selectedHotel.pricePerNight) || 0) * tripNights
        : 0;

    const foodEstimate = calculateFoodEstimate({
        restaurants: selectedRestaurants,
        travellers: trip.travellers,
        tripDays,
    });

    const transportEstimate =
        calculateTransportEstimate({
            selectedPlaces,
            travellers: trip.travellers,
        });

    const activityEstimate =
        calculateActivityEstimate({
            selectedPlaces,
        });


    const minimumTotal =
        totalFlightCost +
        hotelCost +
        foodEstimate.min +
        transportEstimate.min +
        activityEstimate.min;

    const maximumTotal =
        totalFlightCost +
        hotelCost +
        foodEstimate.max +
        transportEstimate.max +
        activityEstimate.max;

    const budgetSummary = {
        minimumTotal,
        maximumTotal,
        budget: trip.budget,
        tripDays,
        tripNights,
    };

    /* ---------------------------------------------------------
       Flight selection
    --------------------------------------------------------- */

    const handleFlightSelect = (flight) => {
        if (step === "outbound") {
            setSelectedOutbound(flight);

            // Changing outbound invalidates previous return.
            setSelectedReturn(null);
        } else {
            setSelectedReturn(flight);
        }
    };

    /* ---------------------------------------------------------
       Load return flights for the selected outbound option
    --------------------------------------------------------- */

    const loadReturnFlights = async () => {
        if (!selectedOutbound?.departureToken) {
            setFlightError(
                "This flight does not include a token for loading return options. Please select another outbound flight."
            );
            return;
        }

        // Switch to the return step immediately so an error can be retried
        // against the return API rather than repeating the outbound search.
        setStep("return");

        try {
            setFlightLoading(true);
            setFlightError("");
            setFlightMessage("");
            setReturnFlights([]);

            console.log("Loading return flights for selected outbound...");

            const result = await getReturnFlights({
                departureToken: selectedOutbound.departureToken,
                travellers: trip.travellers,
                origin: trip.flightOrigin.iataCode,
                destination: trip.flightDestination.iataCode,
                departureDate: trip.departure,
                returnDate: trip.returnDate,
            });

            console.log("REAL RETURN FLIGHTS:", result);

            const normalizedFlights = (result?.flights || []).map(
                (flight, index) =>
                    normalizeFlight(flight, `return-${index}`)
            );

            setReturnFlights(normalizedFlights);
            setSelectedReturn(null);
            setFlightMessage(
                normalizedFlights.length === 0
                    ? result?.message ||
                    "No return flights were found for this selection. Try another outbound flight or travel date."
                    : ""
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error) {
            console.error("Return flight search failed:", error);

            setReturnFlights([]);
            setFlightMessage("");
            setFlightError(
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                "Unable to load return flights for this selection. Please try again."
            );
        } finally {
            setFlightLoading(false);
        }
    };

    /* ---------------------------------------------------------
       Retry flight search
    --------------------------------------------------------- */

    const handleRetryFlights = async () => {
        setFlightError("");
        setFlightMessage("");

        if (step === "outbound") {
            setOutboundRetryCount((count) => count + 1);
            return;
        }

        if (step === "return") {
            await loadReturnFlights();
        }
    };

    /* ---------------------------------------------------------
       Continue button
    --------------------------------------------------------- */

    const handleContinue = async () => {
        if (step === "outbound" && selectedOutbound) {
            await loadReturnFlights();
            return;
        }

        if (step === "return" && selectedReturn) {
            setShowBookingOptions(true);
            return;
        }

        if (step === "hotel" && selectedHotel) {
            alert(
                "Hotel selected! Next step: nearby restaurants and places."
            );
        }
    };

    /* ---------------------------------------------------------
       Change outbound
    --------------------------------------------------------- */

    const handleChangeOutbound = () => {
        setSelectedOutbound(null);
        setSelectedReturn(null);
        setSelectedHotel(null);

        setStep("outbound");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    /* ---------------------------------------------------------
       Select hotel and reset hotel-dependent discovery choices
    --------------------------------------------------------- */

    const handleSelectHotel = (hotel) => {
        setSelectedHotel(hotel);
        setSelectedRestaurants([]);
        setSelectedPlaces([]);
        setRestaurants([]);
        setPlaces([]);
        setDiscoveryError("");
        setDiscoveryMessage("");
    };

    /* ---------------------------------------------------------
       Continue to hotel
    --------------------------------------------------------- */

    const handleContinueToHotel = () => {
        setStep("hotel");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    /* ---------------------------------------------------------
       Back from hotel
    --------------------------------------------------------- */

    const handleBackToFlights = () => {
        setStep("return");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const toggleRestaurant = (restaurant) => {
        setSelectedRestaurants((current) => {
            const exists = current.some(
                (item) => item.id === restaurant.id
            );

            if (exists) {
                return current.filter(
                    (item) => item.id !== restaurant.id
                );
            }

            return [...current, restaurant];
        });
    };

    const togglePlace = (place) => {
        setSelectedPlaces((current) => {
            const exists = current.some(
                (item) => item.id === place.id
            );

            if (exists) {
                return current.filter(
                    (item) => item.id !== place.id
                );
            }

            return [...current, place];
        });
    };

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="min-h-screen bg-slate-50">

            {/* =====================================================
          NAVBAR
      ===================================================== */}

            <nav className="relative z-40 border-b border-blue-100 bg-blue-50">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
                    <a
                        href="/"
                        className="flex items-center gap-2"
                    >
                        <span className="text-2xl">
                            ✈️
                        </span>

                        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                            Trip
                            <span className="text-blue-600">
                                Wise
                            </span>
                        </span>
                    </a>

                    <a
                        href="/"
                        className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-blue-100"
                    >
                        <ArrowLeft size={17} />
                        New Trip
                    </a>
                </div>
            </nav>

            {/* =====================================================
          MAIN
      ===================================================== */}

            <main className="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">

                {/* ===================================================
            STICKY TRIP CONTEXT
        =================================================== */}

                <div className="sticky top-0 z-30 -mx-5 bg-slate-50 px-5 pb-4 pt-2 lg:-mx-8 lg:px-8">

                    {/* Trip Summary */}

                    <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-white p-5 shadow-md md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                    Trip Builder
                                </p>

                                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                                    {trip.from}{" "}
                                    <span className="text-blue-600">
                                        →
                                    </span>{" "}
                                    {trip.destination}
                                </h1>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm">
                                <TripMeta
                                    icon={<CalendarDays size={15} />}
                                    text={`${trip.departure} – ${trip.returnDate}`}
                                />

                                <TripMeta
                                    icon={<Users size={15} />}
                                    text={`${trip.travellers} travellers`}
                                />

                                <TripMeta
                                    text={`Budget ₹${trip.budget.toLocaleString(
                                        "en-IN"
                                    )}`}
                                />
                            </div>

                        </div>
                    </section>

                    {/* Progress */}

                    <section className="mt-4 rounded-xl bg-slate-50">
                        <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider">

                            <span
                                className={
                                    selectedOutbound
                                        ? "text-emerald-600"
                                        : "text-blue-600"
                                }
                            >
                                {selectedOutbound
                                    ? "✓ "
                                    : "1. "}
                                Outbound
                            </span>

                            <span
                                className={
                                    selectedReturn
                                        ? "text-emerald-600"
                                        : step === "return"
                                            ? "text-blue-600"
                                            : "text-slate-400"
                                }
                            >
                                {selectedReturn
                                    ? "✓ "
                                    : "2. "}
                                Return
                            </span>

                            <span
                                className={
                                    selectedHotel
                                        ? "text-emerald-600"
                                        : step === "hotel"
                                            ? "text-blue-600"
                                            : "text-slate-400"
                                }
                            >
                                {selectedHotel ? "✓ " : "3. "}
                                Hotel
                            </span>

                            <span
                                className={
                                    step === "discovery"
                                        ? "text-blue-600"
                                        : ["budget", "itinerary"].includes(step)
                                            ? "text-emerald-600"
                                            : "text-slate-400"
                                }
                            >
                                {["budget", "itinerary"].includes(step)
                                    ? "✓ "
                                    : "4. "}
                                Discovery
                            </span>


                            <span
                                className={
                                    step === "itinerary"
                                        ? "text-emerald-600"
                                        : step === "budget"
                                            ? "text-blue-600"
                                            : "text-slate-400"
                                }
                            >
                                {step === "itinerary" ? "✓ " : "5. "}
                                Budget
                            </span>

                            <span
                                className={
                                    step === "itinerary"
                                        ? "text-blue-600"
                                        : "text-slate-400"
                                }
                            >
                                6. Itinerary
                            </span>

                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                style={{
                                    width: `${progress}%`,
                                }}
                            />
                        </div>
                    </section>
                </div>

                {/* ===================================================
            MAIN TWO COLUMN AREA
        =================================================== */}

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

                    {/* =================================================
              LEFT CONTENT
          ================================================= */}

                    <section>

                        {/* =================================================
                HOTEL STEP
            ================================================= */}

                        {step === "hotel" ? (
                            <>
                                {hotelLoading ? (
                                    <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
                                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                                        <p className="font-bold text-slate-800">
                                            Searching hotels in {trip.destination}...
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Checking {trip.departure} to {trip.returnDate} for {trip.travellers} traveller{trip.travellers === 1 ? "" : "s"}.
                                        </p>
                                    </div>
                                ) : hotelError ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                                        <p className="font-bold text-red-800">
                                            Unable to load hotels
                                        </p>
                                        <p className="mt-2 text-sm leading-6 text-red-700">
                                            {hotelError}
                                        </p>
                                        <div className="mt-5 flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setHotelRetryCount((count) => count + 1)}
                                                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
                                            >
                                                <RefreshCw size={15} />
                                                Retry hotel search
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleBackToFlights}
                                                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-100"
                                            >
                                                Back to flights
                                            </button>
                                        </div>
                                    </div>
                                ) : hotels.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                            <MapPin size={22} />
                                        </div>
                                        <h2 className="mt-4 font-bold text-slate-800">
                                            No priced hotels found
                                        </h2>
                                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                            {hotelMessage || "No hotels with usable prices were returned for these dates. Try a different date range."}
                                        </p>
                                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setHotelRetryCount((count) => count + 1)}
                                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                            >
                                                <RefreshCw size={15} />
                                                Search again
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleBackToFlights}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Back to flights
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <HotelSelection
                                        hotels={hotels}
                                        selectedHotel={selectedHotel}
                                        onSelectHotel={handleSelectHotel}
                                        onDetails={setShowHotelDetails}
                                        nights={tripNights}
                                        onBack={handleBackToFlights}
                                        onContinue={() => {
                                            setStep("discovery");

                                            window.scrollTo({
                                                top: 0,
                                                behavior: "smooth",
                                            });
                                        }}
                                    />
                                )}
                            </>
                        ) : step === "discovery" ? (
                            <DiscoverySelection
                                restaurants={restaurants}
                                places={places}
                                selectedRestaurants={selectedRestaurants}
                                selectedPlaces={selectedPlaces}
                                onToggleRestaurant={toggleRestaurant}
                                onTogglePlace={togglePlace}
                                loading={discoveryLoading}
                                error={discoveryError}
                                message={discoveryMessage}
                                hotelName={selectedHotel?.name || "your selected hotel"}
                                radiusKm={5}
                                onRetry={() => setDiscoveryRetryCount((count) => count + 1)}
                                onContinue={() => {
                                    setStep("budget");

                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                            />
                        ) : step === "budget" ? (
                            <div>
                                <BudgetBreakdown
                                    flightsCost={totalFlightCost}
                                    hotelCost={hotelCost}
                                    foodEstimate={foodEstimate}
                                    transportEstimate={transportEstimate}
                                    activityEstimate={activityEstimate}
                                    budget={trip.budget}
                                />

                                <div className="mt-6 flex flex-wrap justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("discovery");

                                            window.scrollTo({
                                                top: 0,
                                                behavior: "smooth",
                                            });
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Back to Discovery
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep("itinerary");

                                            window.scrollTo({
                                                top: 0,
                                                behavior: "smooth",
                                            });
                                        }}
                                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                                    >
                                        Build My Itinerary
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : step === "itinerary" ? (
                            <FinalItinerary
                                trip={trip}
                                outbound={selectedOutbound}
                                returnFlight={selectedReturn}
                                hotel={selectedHotel}
                                restaurants={selectedRestaurants}
                                places={selectedPlaces}
                                budgetSummary={budgetSummary}
                                onBack={() => {
                                    setStep("budget");

                                    window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                    });
                                }}
                                onFinish={(completedItinerary) => {
                                    // FinalItinerary also stores this plan in sessionStorage.
                                    // Keep a second explicit save here so the parent flow can
                                    // access the complete object in future steps.
                                    try {
                                        sessionStorage.setItem(
                                            "tripwiseCompletedTrip",
                                            JSON.stringify(completedItinerary)
                                        );
                                    } catch (saveError) {
                                        console.error("Unable to save completed trip:", saveError);
                                    }
                                }}
                            />
                        ) : (

                            /* =================================================
                               FLIGHT STEP
                            ================================================= */

                            <>

                                {/* Flight Heading */}

                                <div className="sticky top-[132px] z-20 -mx-2 mb-6 bg-slate-50 px-2 pb-4 pt-3">
                                    <div className="flex flex-wrap items-end justify-between gap-4">

                                        <div>
                                            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                                                Flight selection
                                            </p>

                                            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                                                {sectionTitle}
                                            </h2>

                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                {sectionDescription}
                                            </p>
                                        </div>

                                        {step === "return" && (
                                            <button
                                                type="button"
                                                onClick={handleChangeOutbound}
                                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                                            >
                                                <ArrowLeft size={16} />
                                                Change outbound
                                            </button>
                                        )}

                                    </div>
                                </div>

                                {/* Flight Cards */}

                                <div className="space-y-4">

                                    {flightLoading && (
                                        <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
                                            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                                            <p className="font-bold text-slate-800">
                                                {step === "outbound"
                                                    ? "Searching live flights..."
                                                    : "Finding return flights for your selected outbound..."
                                                }
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                This may take a few seconds.
                                            </p>
                                        </div>
                                    )}


                                    {!flightLoading && flightError && (
                                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                                            <p className="text-sm font-medium text-red-700">
                                                {flightError}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={handleRetryFlights}
                                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
                                            >
                                                <RefreshCw size={15} />
                                                Retry search
                                            </button>
                                        </div>
                                    )}

                                    {!flightLoading &&
                                        !flightError &&
                                        currentFlights.length === 0 && (
                                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                    <Plane size={22} />
                                                </div>

                                                <p className="mt-4 font-bold text-slate-800">
                                                    No flights found
                                                </p>

                                                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                                                    {flightMessage ||
                                                        "No flights were found for this search. Try different dates or a nearby airport."}
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={handleRetryFlights}
                                                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <RefreshCw size={15} />
                                                    Search again
                                                </button>
                                            </div>
                                        )}


                                    {!flightLoading &&
                                        !flightError &&
                                        currentFlights.map((flight) => (
                                            <FlightOptionCard
                                                key={flight.id}
                                                flight={flight}
                                                recommended={flight.recommended}
                                                selected={
                                                    selectedFlight?.id ===
                                                    flight.id
                                                }
                                                onSelect={() =>
                                                    handleFlightSelect(
                                                        flight
                                                    )
                                                }
                                            />
                                        ))}

                                </div>

                                {/* Bottom Action */}

                                {step === "outbound" && (
                                    <div className="mt-7 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={!selectedOutbound}
                                            onClick={handleContinue}
                                            className={`flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition ${selectedOutbound
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                                                : "cursor-not-allowed bg-slate-200 text-slate-400"
                                                }`}
                                        >
                                            Continue to Return
                                            <ChevronRight size={17} />
                                        </button>
                                    </div>
                                )}

                                {/* =================================================
                    SELECTED ROUND TRIP
                ================================================= */}

                                {selectedOutbound &&
                                    selectedReturn && (
                                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                                            <div className="flex items-start gap-3">

                                                <CheckCircle2
                                                    size={21}
                                                    className="mt-0.5 shrink-0 text-emerald-600"
                                                />

                                                <div className="flex-1">

                                                    <p className="font-bold text-emerald-800">
                                                        Round-trip flight
                                                        selected
                                                    </p>

                                                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">

                                                        {/* Outbound */}

                                                        <div className="rounded-xl bg-white p-3">
                                                            <p className="text-xs font-semibold text-slate-400">
                                                                OUTBOUND
                                                            </p>

                                                            <p className="mt-1 font-bold text-slate-800">
                                                                {
                                                                    selectedOutbound.airline
                                                                }
                                                            </p>

                                                            <p className="text-slate-500">
                                                                {
                                                                    selectedOutbound.departureTime
                                                                }{" "}
                                                                →
                                                                {" "}
                                                                {
                                                                    selectedOutbound.arrivalTime
                                                                }
                                                            </p>
                                                        </div>

                                                        {/* Return */}

                                                        <div className="rounded-xl bg-white p-3">
                                                            <p className="text-xs font-semibold text-slate-400">
                                                                RETURN
                                                            </p>

                                                            <p className="mt-1 font-bold text-slate-800">
                                                                {
                                                                    selectedReturn.airline
                                                                }
                                                            </p>

                                                            <p className="text-slate-500">
                                                                {
                                                                    selectedReturn.departureTime
                                                                }{" "}
                                                                →
                                                                {" "}
                                                                {
                                                                    selectedReturn.arrivalTime
                                                                }
                                                            </p>
                                                        </div>

                                                    </div>

                                                    {/* Actions */}

                                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

                                                        <p className="text-sm font-bold text-emerald-800">
                                                            Total flight cost:
                                                            {" "}
                                                            ₹
                                                            {totalFlightCost.toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </p>

                                                        <div className="flex flex-wrap gap-2">

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setShowBookingOptions(
                                                                        true
                                                                    )
                                                                }
                                                                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                                                            >
                                                                <ExternalLink size={15} />
                                                                Booking Options
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleContinueToHotel
                                                                }
                                                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                                            >
                                                                Continue to Hotel
                                                                <ChevronRight size={15} />
                                                            </button>

                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                        </div>
                                    )}

                            </>

                        )}

                    </section>

                    {/* =================================================
              RIGHT TRIP CART
          ================================================= */}

                    <div className="order-first lg:order-last">

                        <TripCart
                            budget={trip.budget}
                            travellers={trip.travellers}
                            outbound={selectedOutbound}
                            returnFlight={selectedReturn}
                            hotel={selectedHotel}
                            nights={tripNights}
                            foodEstimate={foodEstimate}
                            transportEstimate={transportEstimate}
                            activityEstimate={activityEstimate}
                        />

                    </div>

                </div>
            </main>

            {/* =====================================================
          BOOKING OPTIONS MODAL
      ===================================================== */}

            {showBookingOptions && (
                <BookingOptionsModal
                    bookingToken={selectedReturn?.bookingToken}
                    origin={trip.flightOrigin.iataCode}
                    destination={trip.flightDestination.iataCode}
                    departureDate={trip.departure}
                    returnDate={trip.returnDate}
                    onClose={() => setShowBookingOptions(false)}
                />
            )}

            {/* =====================================================
          HOTEL DETAILS MODAL
      ===================================================== */}

            {showHotelDetails && (
                <HotelDetailsModal
                    hotel={showHotelDetails}
                    nights={tripNights}
                    onClose={() =>
                        setShowHotelDetails(null)
                    }
                    onSelect={() => {
                        handleSelectHotel(showHotelDetails);

                        setShowHotelDetails(null);
                    }}
                />
            )}

        </div>
    );
}

/* =========================================================
   TRIP META
========================================================= */

function TripMeta({ icon, text }) {
    return (
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 font-semibold text-slate-600 shadow-sm">

            {icon && (
                <span className="text-blue-600">
                    {icon}
                </span>
            )}

            {text}

        </div>
    );
}

/* =========================================================
   BOOKING OPTIONS MODAL
========================================================= */

function BookingOptionsModal({
    bookingToken,
    origin,
    destination,
    departureDate,
    returnDate,
    onClose,
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(Boolean(bookingToken));
    const [error, setError] = useState("");

    useEffect(() => {
        let isCurrent = true;

        if (!bookingToken) {
            setOptions([]);
            setError(
                "Booking details were not provided for this return-flight selection. Please choose another return option."
            );
            setLoading(false);

            return () => {
                isCurrent = false;
            };
        }

        const loadBookingOptions = async () => {
            setLoading(true);
            setError("");
            setOptions([]);

            try {
                const result = await getBookingOptions({
                    bookingToken,
                    origin,
                    destination,
                    departureDate,
                    returnDate,
                });

                if (!isCurrent) return;

                const availableOptions = Array.isArray(result?.bookingOptions)
                    ? result.bookingOptions
                    : [];

                setOptions(availableOptions);

                if (availableOptions.length === 0) {
                    setError(
                        result?.message ||
                        "No booking options were returned for this itinerary. Try another return flight."
                    );
                }
            } catch (requestError) {
                if (!isCurrent) return;

                setOptions([]);
                setError(
                    requestError?.response?.data?.error ||
                    "Unable to load booking options right now. Please try again."
                );
            } finally {
                if (isCurrent) setLoading(false);
            }
        };

        loadBookingOptions();

        return () => {
            isCurrent = false;
        };
    }, [bookingToken, origin, destination, departureDate, returnDate]);

    const openBookingOption = (option) => {
        const bookingRequest = option?.bookingRequest;
        const rawUrl = bookingRequest?.url;

        if (!rawUrl) return;

        let bookingUrl;

        try {
            bookingUrl = new URL(rawUrl);
        } catch {
            setError("The provider returned an invalid booking link.");
            return;
        }

        // Only allow HTTPS booking actions returned by the provider.
        if (bookingUrl.protocol !== "https:") {
            setError("The provider returned an unsupported booking link.");
            return;
        }

        const postData = bookingRequest?.postData;

        if (typeof postData === "string" && postData.trim()) {
            // Google Flights booking actions commonly require a POST request,
            // not a simple clickable URL. Submit the provider's supplied form
            // data in a new tab instead of pretending the URL is a GET link.
            const form = document.createElement("form");
            form.method = "POST";
            form.action = bookingUrl.href;
            form.target = "_blank";
            form.style.display = "none";

            const values = new URLSearchParams(postData);

            values.forEach((value, key) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            form.remove();
            return;
        }

        // Some providers return a direct HTTPS URL with no POST body.
        const newWindow = window.open(bookingUrl.href, "_blank");

        if (!newWindow) {
            setError(
                "Your browser blocked the booking tab. Allow pop-ups for TripWise and try again."
            );
            return;
        }

        // Keep the new tab isolated from this app after opening it.
        newWindow.opener = null;
    };

    const formatPrice = (price, currency = "INR") => {
        const numericPrice = Number(price);

        if (price === null || price === undefined || !Number.isFinite(numericPrice)) {
            return "Price unavailable";
        }

        try {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
            }).format(numericPrice);
        } catch {
            return `${currency} ${numericPrice.toLocaleString("en-IN")}`;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 p-6">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                            Booking options
                        </p>

                        <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                            Choose where to continue
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Live booking options for your selected flight itinerary.
                            Prices and availability can change before booking.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close booking options"
                        className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4 p-6">
                    {loading && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
                            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                            <p className="font-bold text-slate-800">
                                Loading live booking options...
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                This may take a few seconds.
                            </p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium leading-6 text-amber-800">
                                {error}
                            </p>
                            {bookingToken && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError("");
                                        setLoading(true);
                                        getBookingOptions({
                                            bookingToken,
                                            origin,
                                            destination,
                                            departureDate,
                                            returnDate,
                                        })
                                            .then((result) => {
                                                const fetchedOptions = Array.isArray(result?.bookingOptions)
                                                    ? result.bookingOptions
                                                    : [];
                                                setOptions(fetchedOptions);
                                                setError(
                                                    fetchedOptions.length
                                                        ? ""
                                                        : result?.message || "No bookable options were returned."
                                                );
                                            })
                                            .catch((requestError) => {
                                                setError(
                                                    requestError?.response?.data?.error ||
                                                    "Unable to load booking options. Please try again."
                                                );
                                            })
                                            .finally(() => setLoading(false));
                                    }}
                                    className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                                >
                                    Retry booking search
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && options.map((option, index) => {
                        const bookingRequest = option.bookingRequest;
                        const canBook = Boolean(bookingRequest?.url);
                        const seller = option.seller || "Booking provider";
                        const price = formatPrice(option.price, option.currency || "INR");

                        return (
                            <div
                                key={option.id || `${seller}-${option.leg || "itinerary"}-${index}`}
                                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900">
                                        {seller}
                                    </p>

                                    <p className="mt-1 text-sm leading-5 text-slate-500">
                                        {option.note || "Booking option returned by the provider."}
                                    </p>

                                    {option.separateTickets && (
                                        <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                            Separate ticket
                                        </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                                    <p className="text-xl font-extrabold text-slate-900">
                                        {price}
                                    </p>

                                    <button
                                        type="button"
                                        disabled={!canBook}
                                        onClick={() => openBookingOption(option)}
                                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${canBook
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "cursor-not-allowed bg-slate-100 text-slate-400"
                                            }`}
                                    >
                                        {canBook ? "Continue to booking" : "Booking action unavailable"}
                                        {canBook && <ExternalLink size={15} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs leading-5 text-slate-500">
                    Booking options are supplied by Google Flights through SerpApi. A booking button appears only when the provider returns a booking action. Verify the final price, baggage rules and itinerary on the seller's page before paying.
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   HOTEL DETAILS MODAL
========================================================= */

function HotelDetailsModal({
    hotel,
    nights,
    onClose,
    onSelect,
}) {
    const nightlyPrice = Number(hotel.pricePerNight);
    const hasPrice = Number.isFinite(nightlyPrice) && nightlyPrice > 0;
    const total = hasPrice ? nightlyPrice * nights : null;
    const reviewCount = Number(hotel.reviews) || 0;
    const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">

            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

                {/* Image */}

                <div className="relative h-64 bg-slate-100">

                    <HotelPhoto
                        hotel={hotel}
                        alt={`${hotel.name} hotel photo`}
                        className="h-full w-full object-cover"
                    />

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-md transition hover:bg-white"
                    >
                        <X size={20} />
                    </button>

                </div>

                {/* Content */}

                <div className="p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                Hotel details
                            </p>

                            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                                {hotel.name}
                            </h2>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">

                                {hotel.rating !== null && hotel.rating !== undefined && (
                                    <span className="flex items-center gap-1 font-bold text-amber-500">
                                        <Star size={15} fill="currentColor" />
                                        {hotel.rating}
                                    </span>
                                )}

                                <span className="text-slate-400">
                                    {reviewCount.toLocaleString("en-IN")} reviews
                                </span>

                                {hotel.hotelClass && (
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                                        {hotel.hotelClass}
                                    </span>
                                )}

                            </div>
                        </div>

                        <div className="sm:text-right">

                            <p className="text-2xl font-extrabold text-slate-900">
                                {hasPrice
                                    ? `₹${nightlyPrice.toLocaleString("en-IN")}`
                                    : "Price unavailable"}
                            </p>

                            {hasPrice && (
                                <p className="text-xs text-slate-400">
                                    per night · estimated
                                </p>
                            )}

                        </div>

                    </div>

                    {hotel.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                            {hotel.description}
                        </p>
                    )}

                    {/* Location */}

                    <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4">

                        <MapPin
                            size={19}
                            className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Location
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                {hotel.location}
                            </p>
                        </div>

                    </div>

                    {/* Phone */}

                    {hotel.phone && (
                        <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-4">

                            <Phone
                                size={18}
                                className="text-blue-600"
                            />

                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    Contact
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    {hotel.phone}
                                </p>
                            </div>

                        </div>
                    )}

                    {/* Amenities */}

                    <div className="mt-6">

                        <h3 className="font-bold text-slate-900">
                            Amenities
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-2">

                            {amenities.map(
                                (amenity) => (
                                    <span
                                        key={amenity}
                                        className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                                    >
                                        {amenity}
                                    </span>
                                )
                            )}

                        </div>
                    </div>

                    {/* Total */}

                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">

                        <div className="flex items-center justify-between">

                            <span className="text-sm font-semibold text-slate-600">
                                Estimated stay
                            </span>

                            <span className="text-xl font-extrabold text-slate-900">
                                {total !== null
                                    ? `₹${total.toLocaleString("en-IN")}`
                                    : "Price unavailable"}
                            </span>

                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {nights} nights · before final taxes
                            and fees
                        </p>

                    </div>

                    {/* Actions */}

                    <div className="mt-6 flex flex-wrap justify-end gap-3">

                        {hotel.bookingUrl && (
                            <a
                                href={hotel.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                                Visit hotel website
                                <ExternalLink size={15} />
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={onSelect}
                            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                            Select This Hotel
                        </button>

                    </div>

                </div>
            </div>
        </div>
    );
}

export default Results;