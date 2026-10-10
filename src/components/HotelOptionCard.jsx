import {
  Check,
  Hotel,
  MapPin,
  Star,
} from "lucide-react";

function HotelOptionCard({
  hotel,
  selected,
  recommended = false,
  onSelect,
  onDetails,
  nights,
}) {
  const totalStay =
    hotel.pricePerNight * nights;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? "border-blue-500 ring-2 ring-blue-100 shadow-lg shadow-blue-100/50"
          : recommended
            ? "border-blue-200 shadow-md"
            : "border-slate-200 hover:border-blue-200 hover:shadow-md"
      }`}
    >
      {recommended && (
        <div className="absolute left-0 right-0 top-0 z-10 bg-blue-600 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
          ★ Recommended
        </div>
      )}

      <div className={`${recommended ? "pt-10" : ""}`}>
        <div className="grid md:grid-cols-[230px_1fr]">
          {/* Image */}
          <div className="relative min-h-[190px] bg-slate-100">
            {hotel.image ? (
              <img
                src={hotel.image}
                alt={hotel.name}
                className="h-full min-h-[190px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[190px] items-center justify-center text-blue-500">
                <Hotel size={45} />
              </div>
            )}
          </div>

          {/* Information */}
          <div className="p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:justify-between">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900">
                  {hotel.name}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                    <Star
                      size={15}
                      fill="currentColor"
                    />
                    {hotel.rating}
                  </span>

                  <span className="text-xs text-slate-400">
                    {hotel.reviews.toLocaleString("en-IN")} reviews
                  </span>
                </div>

                <div className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {hotel.location}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {hotel.amenities
                    .slice(0, 4)
                    .map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {amenity}
                      </span>
                    ))}
                </div>
              </div>

              {/* Price */}
              <div className="shrink-0 md:text-right">
                <p className="text-2xl font-extrabold text-slate-900">
                  ₹
                  {hotel.pricePerNight.toLocaleString(
                    "en-IN"
                  )}
                </p>

                <p className="text-xs text-slate-400">
                  per night
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  ₹
                  {totalStay.toLocaleString(
                    "en-IN"
                  )}{" "}
                  total
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                  before final taxes/fees
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={onDetails}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                View Details
              </button>

              <button
                type="button"
                onClick={onSelect}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                  selected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {selected && <Check size={16} />}
                {selected
                  ? "Selected"
                  : "Select Hotel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelOptionCard;