import { CalendarDays } from "lucide-react";

function Itinerary({ days }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <CalendarDays size={21} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Your AI Itinerary
          </h2>

          <p className="text-sm text-slate-500">
            A suggested day-by-day plan
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-7">
        {days.map((day) => (
          <div
            key={day.day}
            className="relative border-l-2 border-slate-200 pl-6"
          >
            <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow" />

            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Day {day.day}
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {day.title}
            </h3>

            <div className="mt-4 space-y-3">
              {day.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <span className="text-xl">
                    {activity.emoji}
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {activity.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Itinerary;