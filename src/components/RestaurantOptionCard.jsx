import {
  Check,
  ExternalLink,
  MapPin,
  Star,
} from "lucide-react";

function RestaurantOptionCard({
  restaurant,
  selected,
  recommended = false,
  onSelect,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? "border-orange-400 ring-2 ring-orange-100 shadow-lg"
          : recommended
            ? "border-orange-200 shadow-md"
            : "border-slate-200 hover:border-orange-200 hover:shadow-md"
      }`}
    >
      {recommended && (
        <div className="absolute left-0 right-0 top-0 z-10 bg-orange-500 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
          ★ Recommended
        </div>
      )}

      <div className={recommended ? "p-5 pt-11" : "p-5"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {restaurant.name}
              </h3>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                {restaurant.priceLevel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                <Star size={15} fill="currentColor" />
                {restaurant.rating}
              </span>

              <span className="text-xs text-slate-400">
                {restaurant.reviews.toLocaleString("en-IN")} reviews
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <MapPin size={16} />
              {restaurant.distance} from hotel
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {restaurant.cuisine}
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              Estimated ₹{restaurant.mealEstimatePerPerson.toLocaleString(
                "en-IN"
              )} per person / meal
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <a
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink size={14} />
              Maps
            </a>

            <button
              type="button"
              onClick={onSelect}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                selected
                  ? "bg-orange-500 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {selected && <Check size={15} />}
              {selected ? "Selected" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestaurantOptionCard;