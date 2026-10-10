import { CheckCircle2, IndianRupee } from "lucide-react";

function BudgetSummary({ budget }) {
  const total =
    budget.flights +
    budget.hotels +
    budget.food +
    budget.transport +
    budget.activities;

  const remaining = budget.limit - total;

  const withinBudget = remaining >= 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <IndianRupee size={21} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Budget Summary
          </h2>

          <p className="text-sm text-slate-500">
            Estimated trip cost
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <BudgetRow label="Flights" amount={budget.flights} />
        <BudgetRow label="Hotels" amount={budget.hotels} />
        <BudgetRow label="Food" amount={budget.food} />
        <BudgetRow label="Local Transport" amount={budget.transport} />
        <BudgetRow label="Activities" amount={budget.activities} />
      </div>

      <div className="my-6 border-t border-slate-200" />

      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">
          Estimated Total
        </span>

        <span className="text-2xl font-extrabold text-slate-900">
          ₹{total.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          Your budget
        </span>

        <span className="font-semibold text-slate-700">
          ₹{budget.limit.toLocaleString("en-IN")}
        </span>
      </div>

      <div
        className={`mt-5 rounded-xl px-4 py-4 ${
          withinBudget
            ? "bg-emerald-50"
            : "bg-amber-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2
            size={19}
            className={
              withinBudget
                ? "text-emerald-600"
                : "text-amber-600"
            }
          />

          <span
            className={`font-bold ${
              withinBudget
                ? "text-emerald-700"
                : "text-amber-700"
            }`}
          >
            {withinBudget
              ? `₹${remaining.toLocaleString(
                  "en-IN"
                )} remaining`
              : `₹${Math.abs(remaining).toLocaleString(
                  "en-IN"
                )} over budget`}
          </span>
        </div>
      </div>
    </div>
  );
}

function BudgetRow({ label, amount }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>

      <span className="font-semibold text-slate-700">
        ₹{amount.toLocaleString("en-IN")}
      </span>
    </div>
  );
}

export default BudgetSummary;