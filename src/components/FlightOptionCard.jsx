
import { Check, Clock3, Plane } from "lucide-react";

function FlightOptionCard({
  flight,
  selected,
  recommended = false,
  onSelect,
}) {
  // Safely format the fare returned by the API.
  const price = Number(flight?.price);
  const formattedPrice = Number.isFinite(price)
    ? `₹${price.toLocaleString("en-IN")}`
    : "Price unavailable";

  // Handle singular and plural stop counts correctly.
  const stops = Number(flight?.stops ?? 0);
  const stopsLabel =
    stops === 0
      ? "Non-stop"
      : `${stops} ${stops === 1 ? "stop" : "stops"}`;

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
      {/* RECOMMENDED BADGE */}

      {recommended && (
        <div className="absolute left-0 right-0 top-0 bg-blue-600 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
          ★ Recommended
        </div>
      )}

      <div className={recommended ? "p-6 pt-11" : "p-6"}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          {/* AIRLINE AND ROUTE */}

          <div className="flex min-w-0 items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                selected
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Plane size={23} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {flight?.airline || "Airline information unavailable"}
                </h3>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                  {flight?.flightNumber || "Flight details unavailable"}
                </span>
              </div>

              {/* DEPARTURE AND ARRIVAL */}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {flight?.departureTime || "--:--"}
                  </p>

                  <p className="text-xs font-medium text-slate-500">
                    {flight?.departureCode || "---"}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <div className="h-px w-5 bg-slate-300 sm:w-8" />

                  <Clock3 size={15} />

                  <span className="text-xs font-medium text-slate-500">
                    {flight?.duration || "Duration unavailable"}
                  </span>

                  <div className="h-px w-5 bg-slate-300 sm:w-8" />
                </div>

                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {flight?.arrivalTime || "--:--"}
                  </p>

                  <p className="text-xs font-medium text-slate-500">
                    {flight?.arrivalCode || "---"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                {stopsLabel}
              </p>
            </div>
          </div>

          {/* FARE AND SELECT BUTTON */}

          <div className="flex shrink-0 items-center justify-between gap-5 border-t border-slate-100 pt-4 md:flex-col md:items-end md:border-0 md:pt-0">
            <div className="text-left md:text-right">
              <p className="text-2xl font-extrabold text-slate-900">
                {formattedPrice}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Total fare estimate for the searched itinerary
              </p>
            </div>

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

              {selected ? "Selected" : "Select Flight"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlightOptionCard;
