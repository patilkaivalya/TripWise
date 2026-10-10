import { useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Hotel,
    MapPin,
    Plane,
    Printer,
    Sparkles,
    Utensils,
} from "lucide-react";

function parseLocalDate(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getDates(startValue, endValue) {
    const start = parseLocalDate(startValue);
    const end = parseLocalDate(endValue);

    if (!start || !end || end < start) {
        return [start || new Date()];
    }

    const dayCount = Math.min(
        Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1),
        31
    );

    return Array.from({ length: dayCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function formatDate(date) {
    return date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatMoney(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "Price unavailable";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatRating(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5) return "";
    return (Math.round(amount * 10) / 10).toFixed(1);
}

function formatReviews(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return "";
    return `${Math.round(amount).toLocaleString("en-IN")} reviews`;
}

function entityKeys(entity) {
    const keys = [];
    if (entity?.id !== null && entity?.id !== undefined && String(entity.id).trim()) {
        keys.push(`id:${String(entity.id).trim().toLowerCase()}`);
    }
    if (entity?.name && String(entity.name).trim()) {
        keys.push(`name:${String(entity.name).trim().toLowerCase().replace(/\s+/g, " ")}`);
    }
    return keys;
}

function getPlaceUrl(place) {
    if (typeof place?.mapsUrl === "string" && place.mapsUrl.startsWith("https://")) {
        return place.mapsUrl;
    }
    const query = encodeURIComponent(`${place?.name || "Place"}, ${place?.address || place?.location || ""}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function getFlightSummary(flight, fallbackTitle) {
    if (!flight) return `${fallbackTitle} was not selected.`;
    const parts = [flight.airline, flight.flightNumber].filter(Boolean);
    const route = [flight.departureCode, flight.arrivalCode].filter(Boolean).join(" → ");
    const time = [flight.departureTime, flight.arrivalTime].filter((value) => value && value !== "--").join(" – ");
    return [parts.join(" "), route, time].filter(Boolean).join(" · ");
}

function getRestaurantName(restaurants, index) {
    if (!restaurants?.length) return null;
    return restaurants[index % restaurants.length];
}

function getScheduleOrder(item) {
    const label = String(item?.time || "").toLowerCase();
    const title = String(item?.title || "").toLowerCase();

    if (label === "flight" || label === "travel") {
        return title.includes("return") ? 1440 : 0;
    }

    const timed = label.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (timed) {
        let hours = Number(timed[1]) % 12;
        const minutes = Number(timed[2]);
        if (timed[3].toLowerCase() === "pm") hours += 12;
        return hours * 60 + minutes;
    }

    if (label.includes("breakfast") || label === "morning") return 8 * 60;
    if (label.includes("after landing")) return 10 * 60;
    if (label.includes("after arrival")) return 12 * 60;
    if (label.includes("before departure")) return 11 * 60;
    if (label.includes("open time")) return 16 * 60;
    if (label.includes("dinner")) return 19 * 60;
    if (label.includes("if time permits") || label.includes("flexible")) return 17 * 60;
    return 12 * 60;
}

function buildSchedule({ dates, trip, outbound, returnFlight, hotel, restaurants, places, availableRestaurants, availablePlaces }) {
    const destination = trip?.destination || "your destination";
    const days = dates.map((date, index) => ({
        date,
        index,
        title: index === 0
            ? "Arrival & check-in"
            : index === dates.length - 1
                ? "Departure day"
                : `Explore ${destination}`,
        items: [],
    }));

    if (days.length === 1) {
        days[0].title = "Travel & explore";
        days[0].items.push({
            time: "Travel",
            kind: "flight",
            title: "Outbound flight",
            detail: getFlightSummary(outbound, "Outbound flight"),
        });
        days[0].items.push({
            time: "After arrival",
            kind: "hotel",
            title: `Check in at ${hotel?.name || "your hotel"}`,
            detail: hotel?.location || hotel?.address || "Confirm check-in arrangements with the property.",
        });
        places.forEach((place, index) => {
            days[0].items.push({
                time: index === 0 ? "Flexible" : "If time permits",
                kind: "place",
                title: place.name || "Selected attraction",
                detail: place.address || place.location || place.description || "Selected place to explore.",
                place,
            });
        });
        days[0].items.push({
            time: "Travel",
            kind: "flight",
            title: "Return flight",
            detail: getFlightSummary(returnFlight, "Return flight"),
        });
        return days;
    }

    // Arrival day: preserve flexibility around the real flight arrival time.
    days[0].items.push({
        time: "Flight",
        kind: "flight",
        title: `Fly to ${destination}`,
        detail: getFlightSummary(outbound, "Outbound flight"),
    });
    days[0].items.push({
        time: "After landing",
        kind: "hotel",
        title: "Transfer and hotel check-in",
        detail: hotel
            ? `${hotel.name}${hotel.location || hotel.address ? ` · ${hotel.location || hotel.address}` : ""}. Confirm the property's check-in time and arrange airport transport.`
            : "Arrange transport and confirm your accommodation check-in details.",
    });

    const finalDay = days[days.length - 1];
    finalDay.items.push({
        time: "Morning",
        kind: "hotel",
        title: "Breakfast and pack",
        detail: "Keep the morning flexible and confirm the hotel's check-out time.",
    });
    finalDay.items.push({
        time: "Before departure",
        kind: "hotel",
        title: "Check out and travel to the airport",
        detail: "Allow a suitable buffer for the transfer and airport procedures.",
    });
    finalDay.items.push({
        time: "Flight",
        kind: "flight",
        title: "Return flight",
        detail: getFlightSummary(returnFlight, "Return flight"),
    });

    // Put selected attractions on sightseeing days, rather than the checkout day.
    const sightseeingDays = days.length > 2
        ? days.slice(1, -1)
        : [days[0]];

    places.forEach((place, index) => {
        const targetDay = sightseeingDays[index % sightseeingDays.length];
        const localIndex = targetDay.items.filter((item) => item.kind === "place").length;
        const times = ["10:00 AM", "2:30 PM", "5:00 PM"];
        targetDay.items.push({
            time: times[Math.min(localIndex, times.length - 1)],
            kind: "place",
            title: place.name || "Selected attraction",
            detail: [place.address || place.location, place.distance, place.description]
                .filter(Boolean)
                .join(" · ") || "Selected place to explore.",
            place,
        });
    });

    // Fill sightseeing days with optional nearby discoveries returned by the API.
    // These are clearly marked as suggestions, not user-selected activities.
    const selectedPlaceKeys = new Set(places.flatMap(entityKeys));
    const optionalPlaces = [];
    const seenOptionalPlaceKeys = new Set(selectedPlaceKeys);
    (Array.isArray(availablePlaces) ? availablePlaces : []).forEach((place) => {
        const keys = entityKeys(place);
        if (!keys.length || keys.some((key) => seenOptionalPlaceKeys.has(key))) return;
        optionalPlaces.push(place);
        keys.forEach((key) => seenOptionalPlaceKeys.add(key));
    });

    const daysWithoutSelectedAttraction = sightseeingDays.filter(
        (day) => !day.items.some((item) => item.kind === "place")
    );
    daysWithoutSelectedAttraction.forEach((day, index) => {
        const place = optionalPlaces[index];
        if (!place) return;
        day.items.push({
            time: day.index % 2 === 1 ? "10:00 AM" : "2:30 PM",
            kind: "optionalPlace",
            title: `Optional nearby idea: ${place.name || "Explore a nearby place"}`,
            detail: [place.address || place.location, place.distance, place.description]
                .filter(Boolean)
                .join(" · ") || "A nearby option from the discovery results. Check opening hours before visiting.",
            place,
        });
    });

    // Use distinct restaurant options across the itinerary rather than repeating
    // the same two restaurants for lunch and dinner every day. Selected choices
    // come first; additional options are explicitly marked as optional.
    const selectedRestaurantKeys = new Set(restaurants.flatMap(entityKeys));
    const restaurantPool = [];
    const seenRestaurantKeys = new Set();
    [...restaurants, ...(Array.isArray(availableRestaurants) ? availableRestaurants : [])].forEach((restaurant) => {
        const keys = entityKeys(restaurant);
        if (!keys.length || keys.some((key) => seenRestaurantKeys.has(key))) return;
        restaurantPool.push({
            restaurant,
            selected: keys.some((key) => selectedRestaurantKeys.has(key)),
        });
        keys.forEach((key) => seenRestaurantKeys.add(key));
    });

    // One named meal suggestion per day keeps the plan readable and avoids
    // manufacturing repeated lunch/dinner reservations. The other meals remain flexible.
    const mealSlots = days
        .filter((day) => day.index !== days.length - 1)
        .map((day) => ({
            day,
            time: day.index === 0 ? "Dinner (flexible)" : day.index % 2 === 1 ? "12:30 PM" : "7:00 PM",
            label: day.index === 0 ? "Arrival dinner" : day.index % 2 === 1 ? "Lunch option" : "Dinner option",
        }));

    mealSlots.forEach((slot, index) => {
        const option = restaurantPool[index];
        if (!option) {
            slot.day.items.push({
                time: slot.time,
                kind: "free",
                title: "Meals at your own pace",
                detail: "No specific restaurant is assigned for this meal. Choose a nearby place that suits your preferences and confirm its opening hours.",
            });
            return;
        }

        const { restaurant, selected } = option;
        slot.day.items.push({
            time: slot.time,
            kind: selected ? "restaurant" : "optionalRestaurant",
            title: `${slot.label}: ${restaurant.name || "nearby restaurant"}`,
            detail: [
                restaurant.cuisine,
                restaurant.address || restaurant.location,
                restaurant.distance,
                restaurant.mealEstimatePerPerson
                    ? `about ${formatMoney(restaurant.mealEstimatePerPerson)} per person`
                    : null,
                selected ? null : "Optional suggestion, not selected earlier",
            ].filter(Boolean).join(" · "),
            place: restaurant,
        });
    });

    days.forEach((day) => {
        if (day.index > 0 && day.index < days.length - 1) {
            day.items.push({
                time: "Open time",
                kind: "free",
                title: "Rest, shopping or explore at your own pace",
                detail: "Keep some room for weather, travel time and places you discover along the way.",
            });
        }
        day.items.sort((a, b) => getScheduleOrder(a) - getScheduleOrder(b));
    });

    return days;
}

const itemStyles = {
    flight: { icon: Plane, tone: "bg-blue-50 text-blue-700", label: "Flight" },
    hotel: { icon: Hotel, tone: "bg-violet-50 text-violet-700", label: "Stay" },
    place: { icon: MapPin, tone: "bg-emerald-50 text-emerald-700", label: "Attraction" },
    restaurant: { icon: Utensils, tone: "bg-amber-50 text-amber-700", label: "Food" },
    optionalRestaurant: { icon: Utensils, tone: "bg-orange-50 text-orange-700", label: "Optional food idea" },
    optionalPlace: { icon: MapPin, tone: "bg-sky-50 text-sky-700", label: "Optional idea" },
    free: { icon: Clock3, tone: "bg-slate-100 text-slate-600", label: "Flexible" },
};

export default function FinalItinerary({
    trip,
    outbound,
    returnFlight,
    hotel,
    restaurants = [],
    places = [],
    availableRestaurants = [],
    availablePlaces = [],
    budgetSummary = {},
    onBack,
    onFinish,
}) {
    const [completed, setCompleted] = useState(false);
    const [saveError, setSaveError] = useState("");
    const itineraryRef = useRef(null);

    const dates = useMemo(
        () => getDates(trip?.departure, trip?.returnDate),
        [trip?.departure, trip?.returnDate]
    );

    const itineraryDays = useMemo(
        () => buildSchedule({ dates, trip, outbound, returnFlight, hotel, restaurants, places, availableRestaurants, availablePlaces }),
        [dates, trip, outbound, returnFlight, hotel, restaurants, places, availableRestaurants, availablePlaces]
    );

    const minTotal = Number(budgetSummary?.minimumTotal);
    const maxTotal = Number(budgetSummary?.maximumTotal);
    const hasBudgetRange = Number.isFinite(minTotal) && Number.isFinite(maxTotal);

    // Print only the itinerary itself in a clean document. Printing the entire
    // results page caused the navbar, progress tracker, and Trip Cart to leak
    // into the PDF, and could leave mostly blank pages around sticky elements.
    const handlePrint = () => {
        const source = itineraryRef.current;
        if (!source) {
            setSaveError("The itinerary is not ready to print yet. Please try again.");
            return;
        }

        const printWindow = window.open("", "_blank", "width=1000,height=800");
        if (!printWindow) {
            setSaveError("Your browser blocked the print window. Allow pop-ups for TripWise and try again.");
            return;
        }

        setSaveError("");
        printWindow.opener = null;

        const clonedContent = source.cloneNode(true);
        clonedContent.querySelectorAll(".tripwise-no-print").forEach((element) => element.remove());
        // The app's component-level print rules are superseded by the isolated
        // document styles below; avoid copying that nested style tag as content.
        clonedContent.querySelectorAll("style").forEach((style) => style.remove());

        const appStyles = Array.from(
            document.head.querySelectorAll('link[rel="stylesheet"], style')
        ).map((element) => element.outerHTML).join("\n");

        const printStyles = `
            @page { size: A4 portrait; margin: 12mm; }
            *, *::before, *::after { box-sizing: border-box; }
            html, body {
                width: 100% !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.4; }
            #tripwise-print-content, .tripwise-itinerary {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            .tripwise-no-print { display: none !important; }
            .tripwise-print-card { box-shadow: none !important; }
            article, section { break-inside: auto; page-break-inside: auto; }
            .tripwise-print-card { break-inside: avoid; page-break-inside: avoid; }
            a { color: inherit !important; text-decoration: none !important; }
            svg { flex-shrink: 0; }
            @media print {
                body { margin: 0 !important; }
                .tripwise-itinerary > section { margin-top: 0; }
                .tripwise-itinerary .space-y-4 > article { margin-bottom: 8pt; }
                .tripwise-itinerary article .py-4 { padding-top: 6pt !important; padding-bottom: 6pt !important; }
                .tripwise-itinerary article .px-5 { padding-left: 10pt !important; padding-right: 10pt !important; }
                .tripwise-itinerary article .text-sm { font-size: 9pt !important; line-height: 1.35 !important; }
                .tripwise-itinerary article .text-lg { font-size: 12pt !important; }
            }
        `;

        const title = `TripWise itinerary - ${String(trip?.destination || "Trip").replace(/[<>]/g, "")}`;
        printWindow.document.open();
        printWindow.document.write(`<!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <base href="${document.baseURI}" />
                <title>${title}</title>
                ${appStyles}
                <style>${printStyles}</style>
              </head>
              <body><main id="tripwise-print-content">${clonedContent.outerHTML}</main></body>
            </html>`);
        printWindow.document.close();

        const openPrintDialog = async () => {
            try {
                const stylesheetLinks = Array.from(
                    printWindow.document.querySelectorAll('link[rel="stylesheet"]')
                );
                await Promise.all(stylesheetLinks.map((link) => {
                    if (link.sheet) return Promise.resolve();
                    return new Promise((resolve) => {
                        link.addEventListener("load", resolve, { once: true });
                        link.addEventListener("error", resolve, { once: true });
                        window.setTimeout(resolve, 2500);
                    });
                }));
                if (printWindow.document.fonts?.ready) {
                    await printWindow.document.fonts.ready;
                }
                const images = Array.from(printWindow.document.images);
                await Promise.all(images.map((image) => {
                    if (image.complete) return Promise.resolve();
                    return new Promise((resolve) => {
                        image.addEventListener("load", resolve, { once: true });
                        image.addEventListener("error", resolve, { once: true });
                    });
                }));
                printWindow.focus();
                printWindow.print();
            } catch (error) {
                console.error("Unable to open TripWise print dialog:", error);
                setSaveError("Unable to prepare the PDF. Please try Print / Save as PDF again.");
            }
        };

        window.setTimeout(openPrintDialog, 150);
    };

    const saveCompletedPlan = () => {
        const completedPlan = {
            trip,
            outbound,
            returnFlight,
            hotel,
            restaurants,
            places,
            budgetSummary,
            itinerary: itineraryDays.map((day) => ({
                date: formatDateOnly(day.date),
                title: day.title,
                items: day.items.map(({ time, kind, title, detail, place }) => ({
                    time, kind, title, detail,
                    placeId: place?.id || null,
                    mapsUrl: place ? getPlaceUrl(place) : null,
                })),
            })),
            completedAt: new Date().toISOString(),
        };

        try {
            const serializedPlan = JSON.stringify(completedPlan);
            sessionStorage.setItem("tripwiseCompletedTrip", serializedPlan);

            // Verify that session storage actually retained the plan before
            // showing a successful save state in the UI.
            if (sessionStorage.getItem("tripwiseCompletedTrip") !== serializedPlan) {
                throw new Error("Saved plan could not be verified in session storage.");
            }
        } catch (error) {
            console.error("Unable to save completed TripWise plan:", error);
            setCompleted(false);
            setSaveError("TripWise could not save this plan in the current browser session. Use Print / Save as PDF to keep a copy on your device.");
            return;
        }

        try {
            onFinish?.(completedPlan);
        } catch (error) {
            // The plan has already been saved by this component, so a parent
            // callback failure should not misreport the local save as failed.
            console.error("Trip saved, but the parent save callback failed:", error);
        }

        setSaveError("");
        setCompleted(true);
    };

    return (
        <div ref={itineraryRef} className="tripwise-itinerary space-y-6 pb-10">

            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8 tripwise-print-card">
                <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                            <Sparkles size={14} /> Your TripWise plan
                        </div>
                        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
                            {trip?.destination ? `Your ${trip.destination} itinerary` : "Your travel itinerary"}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
                            A practical draft based on your chosen flights, hotel, restaurants and attractions. Adjust the order to suit opening hours and local travel conditions.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:min-w-48">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-100">Trip duration</p>
                        <p className="mt-1 text-2xl font-extrabold">{dates.length} day{dates.length === 1 ? "" : "s"}</p>
                        <p className="mt-1 text-sm text-blue-100">{dates[0] ? formatDate(dates[0]) : "Dates unavailable"}</p>
                        {dates.length > 1 && <p className="text-sm text-blue-100">to {formatDate(dates[dates.length - 1])}</p>}
                    </div>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Travellers", value: trip?.travellers ?? "—" },
                        { label: "Hotel", value: hotel?.name || "Not selected" },
                        { label: "Attractions", value: places.length },
                        { label: "Restaurants", value: restaurants.length },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl bg-white/10 p-3">
                            <p className="text-xs font-semibold text-blue-100">{item.label}</p>
                            <p className="mt-1 line-clamp-2 text-sm font-extrabold">{item.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm tripwise-print-card">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Plane size={20} /></div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Outbound flight</p>
                            <p className="mt-1 font-extrabold text-slate-900">{outbound?.airline || "Select an outbound flight"}</p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{getFlightSummary(outbound, "Outbound flight")}</p>
                    <p className="mt-2 text-sm text-slate-500">Date: {trip?.departure || "Not available"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm tripwise-print-card">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Plane size={20} className="rotate-180" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Return flight</p>
                            <p className="mt-1 font-extrabold text-slate-900">{returnFlight?.airline || "Select a return flight"}</p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{getFlightSummary(returnFlight, "Return flight")}</p>
                    <p className="mt-2 text-sm text-slate-500">Date: {trip?.returnDate || "Not available"}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 tripwise-print-card">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Hotel size={20} /></div>
                    <div>
                        <h3 className="font-extrabold text-slate-900">Your stay</h3>
                        <p className="text-sm text-slate-500">Based on the hotel you selected</p>
                    </div>
                </div>
                {hotel ? (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-lg font-extrabold text-slate-900">{hotel.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{hotel.address || hotel.location || trip?.destination}</p>
                            {formatRating(hotel.rating) && (
                                <p className="mt-1 text-sm text-amber-600">
                                    ★ {formatRating(hotel.rating)}{formatReviews(hotel.reviews) ? ` · ${formatReviews(hotel.reviews)}` : ""}
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3 sm:text-right">
                            <p className="text-xs font-semibold text-slate-500">Listed nightly rate</p>
                            <p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoney(hotel.pricePerNight)}</p>
                        </div>
                    </div>
                ) : <p className="mt-4 text-sm text-slate-500">No hotel was selected.</p>}
            </section>

            <section>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Day-by-day plan</p>
                        <h3 className="mt-1 text-2xl font-extrabold text-slate-900">Your schedule</h3>
                    </div>
                    <p className="text-sm text-slate-500">Time slots are suggestions, not reservations.</p>
                </div>

                <div className="space-y-4">
                    {itineraryDays.map((day) => (
                        <article key={`${day.index}-${day.date.toISOString()}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm tripwise-print-card">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-600 text-white">
                                        <span className="text-[10px] font-bold uppercase">Day</span>
                                        <span className="text-lg font-extrabold leading-none">{day.index + 1}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-slate-900">{day.title}</h4>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays size={14} /> {formatDate(day.date)}</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{day.items.length} plan item{day.items.length === 1 ? "" : "s"}</span>
                            </div>

                            <div className="divide-y divide-slate-100 px-5">
                                {day.items.map((item, index) => {
                                    const style = itemStyles[item.kind] || itemStyles.free;
                                    const Icon = style.icon;
                                    return (
                                        <div key={`${item.kind}-${item.title}-${index}`} className="flex gap-3 py-4 sm:gap-4">
                                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tone}`}><Icon size={18} /></div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.time}</span>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.tone}`}>{style.label}</span>
                                                </div>
                                                <h5 className="mt-1 font-bold text-slate-900">{item.title}</h5>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                                                {item.place && (
                                                    <a href={getPlaceUrl(item.place)} target="_blank" rel="noreferrer" className="tripwise-no-print mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800">
                                                        <MapPin size={14} /> Open map <span aria-hidden="true">↗</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 tripwise-print-card">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><CheckCircle2 size={20} /></div>
                    <div>
                        <h3 className="font-extrabold text-slate-900">Budget snapshot</h3>
                        <p className="text-sm text-slate-500">Estimate from the current selections</p>
                    </div>
                </div>
                {hasBudgetRange ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-slate-500">Estimated low end</p>
                            <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(minTotal)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-slate-500">Estimated high end</p>
                            <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(maxTotal)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-slate-500">Your budget</p>
                            <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(budgetSummary.budget ?? trip?.budget)}</p>
                            {Number.isFinite(Number(budgetSummary.budget ?? trip?.budget)) && Number.isFinite(maxTotal) && (
                                <p className={`mt-1 text-xs font-semibold ${Number(budgetSummary.budget ?? trip?.budget) >= maxTotal ? "text-emerald-700" : "text-amber-700"}`}>
                                    {Number(budgetSummary.budget ?? trip?.budget) >= maxTotal ? "Within the current estimate" : "May exceed the current estimate"}
                                </p>
                            )}
                        </div>
                    </div>
                ) : <p className="mt-4 text-sm text-slate-500">Budget estimate is unavailable. Return to Budget to review the current totals.</p>}
                <p className="mt-3 text-xs leading-5 text-slate-500">This is an estimate, not a quote. It may exclude taxes, fees, changes in flight or hotel prices, tickets, and local transport variations.</p>
            </section>

            <div className="tripwise-no-print flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={onBack} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <ArrowLeft size={16} /> Back to budget
                </button>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                        <Printer size={16} /> Print / Save as PDF
                    </button>
                    <button type="button" onClick={saveCompletedPlan} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition ${completed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                        {completed ? <CheckCircle2 size={16} /> : <Download size={16} />}
                        {completed ? "Plan saved in this session" : "Complete and save trip plan"}
                    </button>
                </div>
            </div>

            {saveError && (
                <div role="alert" className="tripwise-no-print rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
                    {saveError}
                </div>
            )}

            {completed && (
                <div className="tripwise-no-print rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                    <p className="font-bold">Your TripWise plan is saved for this browser session.</p>
                    <p>You can still print it or choose “Print / Save as PDF” to keep a copy on your device.</p>
                </div>
            )}

            <p className="text-xs leading-5 text-slate-500">Please reconfirm flight status, hotel policies, attraction opening hours, transport times, prices and reservations before travelling. The schedule is arranged from your selections and is not an AI-provider response or a live booking confirmation.</p>
        </div>
    );
}
