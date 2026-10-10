import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    MapPin,
    Star,
} from "lucide-react";

import HotelPhoto from "./HotelPhoto";

function formatINR(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return "Price unavailable";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function HotelSelection({
    hotels = [],
    selectedHotel,
    onSelectHotel,
    onDetails,
    nights = 1,
    onBack,
    onContinue,
}) {
    const safeHotels = Array.isArray(hotels) ? hotels : [];
    const stayNights = Math.max(1, Number(nights) || 1);
    const hasSelection = Boolean(selectedHotel?.id);

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                        Step 3 · Accommodation
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                        Choose your hotel
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Compare available stays and nightly prices for your trip dates. Hotel photos may vary in availability by provider.
                    </p>
                </div>
                <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                    {safeHotels.length} {safeHotels.length === 1 ? "hotel" : "hotels"} found
                </span>
            </div>

            {safeHotels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <div className="text-4xl" aria-hidden="true">🏨</div>
                    <h3 className="mt-3 font-bold text-slate-800">No hotels to display</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Go back and try another destination or date range.
                    </p>
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                    {safeHotels.map((hotel) => {
                        const selected = selectedHotel?.id === hotel.id;
                        const nightlyRate = Number(hotel.pricePerNight);
                        const hasRate = Number.isFinite(nightlyRate) && nightlyRate > 0;
                        const total = hasRate ? nightlyRate * stayNights : null;
                        const amenities = Array.isArray(hotel.amenities)
                            ? hotel.amenities.filter(Boolean).slice(0, 4)
                            : [];
                        const rating = Number(hotel.rating);
                        const reviews = Number(hotel.reviews) || 0;

                        return (
                            <article
                                key={hotel.id}
                                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected
                                    ? "border-blue-500 ring-2 ring-blue-100"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                    }`}
                            >
                                <div className="relative h-48 overflow-hidden bg-slate-100">
                                    <HotelPhoto
                                        hotel={hotel}
                                        alt={`${hotel.name} hotel photo`}
                                        className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
                                    />

                                    {hotel.recommended && (
                                        <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            Recommended
                                        </span>
                                    )}

                                    {selected && (
                                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                                            <CheckCircle2 size={14} /> Selected
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-extrabold leading-snug text-slate-900">
                                                {hotel.name || "Hotel name unavailable"}
                                            </h3>
                                            <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-slate-500">
                                                <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600" />
                                                <span>{hotel.location || hotel.address || "Location unavailable"}</span>
                                            </p>
                                        </div>

                                        {Number.isFinite(rating) && rating > 0 && (
                                            <div className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-bold text-amber-700">
                                                <Star size={14} fill="currentColor" />
                                                {rating.toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        {reviews > 0 && (
                                            <span>{reviews.toLocaleString("en-IN")} reviews</span>
                                        )}
                                        {hotel.hotelClass && (
                                            <span className="rounded-full bg-slate-100 px-2 py-1">
                                                {hotel.hotelClass} star property
                                            </span>
                                        )}
                                    </div>

                                    {amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {amenities.map((amenity, index) => (
                                                <span
                                                    key={`${hotel.id}-amenity-${index}`}
                                                    className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                                                >
                                                    {typeof amenity === "string"
                                                        ? amenity
                                                        : amenity?.name || amenity?.title || "Amenity"}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">Per night</p>
                                            <p className="mt-0.5 text-xl font-extrabold text-slate-900">
                                                {formatINR(hotel.pricePerNight)}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {total !== null
                                                    ? `${formatINR(total)} for ${stayNights} ${stayNights === 1 ? "night" : "nights"}`
                                                    : "Total unavailable"}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onDetails?.(hotel)}
                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                                        >
                                            Details <ChevronRight size={15} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onSelectHotel?.(hotel)}
                                        aria-pressed={selected}
                                        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${selected
                                            ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                            }`}
                                    >
                                        {selected ? (
                                            <><CheckCircle2 size={17} /> Selected hotel</>
                                        ) : (
                                            "Choose this hotel"
                                        )}
                                    </button>

                                    {typeof hotel.bookingUrl === "string" && hotel.bookingUrl.startsWith("https://") && (
                                        <a
                                            href={hotel.bookingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex w-full items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700"
                                        >
                                            View provider listing <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    <ArrowLeft size={16} /> Back to flights
                </button>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="px-1 text-xs text-slate-500">
                        {hasSelection
                            ? `Selected: ${selectedHotel.name}`
                            : "Select a hotel to continue"}
                    </p>
                    <button
                        type="button"
                        onClick={onContinue}
                        disabled={!hasSelection}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${hasSelection
                            ? "bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700"
                            : "cursor-not-allowed bg-slate-200 text-slate-400"
                            }`}
                    >
                        Continue to nearby places <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </section>
    );
}
