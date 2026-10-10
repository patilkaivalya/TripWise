import { MapPin, Star } from "lucide-react";

function PlaceCard({ place }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
      <div className="flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 text-4xl">
        {place.emoji}
      </div>

      <div className="mt-4">
        <h3 className="font-bold text-slate-900">
          {place.name}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-amber-500">
          <Star size={14} fill="currentColor" />
          {place.rating}
        </div>

        <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <span>{place.location}</span>
        </div>
      </div>
    </div>
  );
}

export default PlaceCard;