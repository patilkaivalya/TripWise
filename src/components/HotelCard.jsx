import { Hotel, MapPin, Star } from "lucide-react";

function HotelCard({ hotel }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Hotel size={26} />
        </div>

        <div className="flex-1">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {hotel.name}
              </h3>

              <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-amber-500">
                <Star size={15} fill="currentColor" />
                {hotel.rating}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xl font-extrabold text-slate-900">
                ₹{hotel.price.toLocaleString("en-IN")}
              </p>

              <p className="text-xs text-slate-400">
                per night
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={16} />
            {hotel.location}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelCard;