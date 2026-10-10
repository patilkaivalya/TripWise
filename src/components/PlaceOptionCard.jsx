import {
  Check,
  ExternalLink,
  MapPin,
  Star,
} from "lucide-react";

function PlaceOptionCard({
  place,
  selected,
  recommended = false,
  onSelect,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? "border-blue-500 ring-2 ring-blue-100 shadow-lg"
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

      <div className={recommended ? "p-5 pt-11" : "p-5"}>
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 text-3xl">
            {place.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {place.name}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                    <Star size={15} fill="currentColor" />
                    {place.rating}
                  </span>

                  <span className="text-xs text-slate-400">
                    {place.reviews.toLocaleString("en-IN")} reviews
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={15} />
                  {place.distance} from hotel
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {place.description}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <a
                  href={place.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  Maps
                </a>

                <a
                  href={place.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Directions
                </a>

                <button
                  type="button"
                  onClick={onSelect}
                  className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    selected
                      ? "bg-blue-600 text-white"
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
      </div>
    </div>
  );
}

export default PlaceOptionCard;