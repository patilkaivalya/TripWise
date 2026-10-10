import { Clock3, Plane } from "lucide-react";

function FlightCard({ flight }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Plane size={24} />
          </div>

          <div>
            <p className="text-lg font-bold text-slate-900">
              {flight.airline}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {flight.route}
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Clock3 size={16} />
              {flight.duration}
            </div>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-2xl font-extrabold text-slate-900">
            ₹{flight.price.toLocaleString("en-IN")}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            estimated fare
          </p>
        </div>
      </div>
    </div>
  );
}

export default FlightCard;