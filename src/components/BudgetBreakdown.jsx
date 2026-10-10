import {
  Car,
  CheckCircle2,
  Hotel,
  IndianRupee,
  Plane,
  Utensils,
  AlertTriangle,
} from "lucide-react";

function BudgetBreakdown({
  flightsCost,
  hotelCost,
  foodEstimate,
  transportEstimate,
  activityEstimate,
  budget,
}) {
  const minimumTotal =
    flightsCost +
    hotelCost +
    foodEstimate.min +
    transportEstimate.min +
    activityEstimate.min;

  const maximumTotal =
    flightsCost +
    hotelCost +
    foodEstimate.max +
    transportEstimate.max +
    activityEstimate.max;

  const minimumDifference =
    budget - minimumTotal;

  const maximumDifference =
    budget - maximumTotal;

  let status = "within";
  
  if (minimumDifference < 0) {
    status = "over";
  } else if (maximumDifference < 0) {
    status = "tight";
  }

  return (
    <div className="space-y-6">

      {/* Cost breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Budget breakdown
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            What your trip is likely to cost
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Flights and hotel are based on your selections.
            Food, transport and activities are estimates.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <BudgetRow
            icon={<Plane size={18} />}
            label="Flights"
            value={`₹${flightsCost.toLocaleString("en-IN")}`}
            type="confirmed"
          />

          <BudgetRow
            icon={<Hotel size={18} />}
            label="Hotel"
            value={`₹${hotelCost.toLocaleString("en-IN")}`}
            type="confirmed"
          />

          <BudgetRow
            icon={<Utensils size={18} />}
            label="Food"
            value={`${formatRange(foodEstimate.min, foodEstimate.max)}`}
            type="estimated"
          />

          <BudgetRow
            icon={<Car size={18} />}
            label="Local transport"
            value={formatRange(
              transportEstimate.min,
              transportEstimate.max
            )}
            type="estimated"
          />

          <BudgetRow
            icon={<IndianRupee size={18} />}
            label="Activities"
            value={formatRange(
              activityEstimate.min,
              activityEstimate.max
            )}
            type="estimated"
          />
        </div>

        <div className="my-6 border-t border-slate-200" />

        {/* Total */}
        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Projected trip cost
              </p>

              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {formatRange(
                  minimumTotal,
                  maximumTotal
                )}
              </p>
            </div>

            <div className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700">
              Estimated
            </div>
          </div>
        </div>
      </div>

      {/* Budget status */}
      <BudgetStatus
        status={status}
        budget={budget}
        minimumTotal={minimumTotal}
        maximumTotal={maximumTotal}
        minimumDifference={minimumDifference}
        maximumDifference={maximumDifference}
      />
    </div>
  );
}

function BudgetRow({
  icon,
  label,
  value,
  type,
}) {
  const isEstimated = type === "estimated";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          isEstimated
            ? "bg-amber-50 text-amber-600"
            : "bg-blue-50 text-blue-600"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {isEstimated ? "Estimated" : "Confirmed selection"}
        </p>
      </div>

      <span className="text-right text-sm font-bold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function BudgetStatus({
  status,
  budget,
  minimumTotal,
  maximumTotal,
  minimumDifference,
  maximumDifference,
}) {
  if (status === "within") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={23}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-lg font-extrabold text-emerald-800">
              Your trip fits the budget
            </p>

            <p className="mt-2 text-sm leading-6 text-emerald-700">
              Even the higher end of the current estimate stays
              within your ₹{budget.toLocaleString("en-IN")} budget.
            </p>

            <p className="mt-3 text-sm font-bold text-emerald-800">
              Estimated remaining:
              {" "}
              ₹{maximumDifference.toLocaleString("en-IN")}
              {" "}
              or more
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "tight") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={23}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-lg font-extrabold text-amber-800">
              Your budget is tight
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-700">
              The lower estimate fits your budget, but the higher
              estimate could exceed it.
            </p>

            <p className="mt-3 text-sm font-bold text-amber-800">
              Budget:
              {" "}
              ₹{budget.toLocaleString("en-IN")}
            </p>

            <p className="mt-1 text-sm font-bold text-amber-800">
              Possible overage:
              {" "}
              ₹
              {Math.abs(maximumDifference).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={23}
          className="mt-0.5 shrink-0 text-red-600"
        />

        <div>
          <p className="text-lg font-extrabold text-red-800">
            This trip is over budget
          </p>

          <p className="mt-2 text-sm leading-6 text-red-700">
            Even the lowest current estimate is above your
            selected budget of ₹
            {budget.toLocaleString("en-IN")}.
          </p>

          <p className="mt-3 text-sm font-bold text-red-800">
            Lowest estimated overage:
            {" "}
            ₹
            {Math.abs(minimumDifference).toLocaleString(
              "en-IN"
            )}
          </p>

          <p className="mt-1 text-sm font-bold text-red-800">
            Highest estimated overage:
            {" "}
            ₹
            {Math.abs(maximumDifference).toLocaleString(
              "en-IN"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatRange(min, max) {
  if (min === max) {
    return `₹${min.toLocaleString("en-IN")}`;
  }

  return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString(
    "en-IN"
  )}`;
}

export default BudgetBreakdown;