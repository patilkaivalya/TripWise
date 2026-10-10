import {
    Plane,
    Hotel,
    Utensils,
    CarFront,
    Ticket,
    Wallet,
    Users,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function formatINR(value) {
    const amount = toNumber(value);
    if (amount === null) return "—";

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function readEstimate(estimate) {
    const min = toNumber(estimate?.min);
    const max = toNumber(estimate?.max);

    if (min === null || max === null) {
        return { min: 0, max: 0, available: false };
    }

    return {
        min: Math.min(min, max),
        max: Math.max(min, max),
        available: true,
    };
}

function formatRange(estimate) {
    if (!estimate?.available) return "Not estimated";
    if (estimate.min === estimate.max) return formatINR(estimate.min);
    return `${formatINR(estimate.min)} – ${formatINR(estimate.max)}`;
}

function CartRow({ icon: Icon, title, subtitle, value, tone = "blue" }) {
    const iconTone = {
        blue: "bg-blue-50 text-blue-600",
        violet: "bg-violet-50 text-violet-600",
        amber: "bg-amber-50 text-amber-600",
        slate: "bg-slate-100 text-slate-600",
        emerald: "bg-emerald-50 text-emerald-600",
    }[tone] || "bg-blue-50 text-blue-600";

    return (
        <div className="flex items-start gap-3 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
                <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{subtitle}</p>}
            </div>
            <div className="max-w-[58%] text-right text-sm font-extrabold leading-5 text-slate-800">
                {value}
            </div>
        </div>
    );
}

export default function TripCart({
    budget = 0,
    travellers = 1,
    outbound,
    returnFlight,
    hotel,
    nights = 1,
    foodEstimate,
    transportEstimate,
    activityEstimate,
}) {
    const safeBudget = toNumber(budget) ?? 0;
    const safeTravellers = Math.max(1, Number(travellers) || 1);
    const safeNights = Math.max(1, Number(nights) || 1);

    // Match Results.jsx: the selected return itinerary price is used when
    // available; otherwise use the selected outbound option price.
    const flightCost = toNumber(returnFlight?.price ?? outbound?.price) ?? 0;
    const nightlyRate = toNumber(hotel?.pricePerNight) ?? 0;
    const hotelCost = hotel ? nightlyRate * safeNights : 0;

    const food = readEstimate(foodEstimate);
    const transport = readEstimate(transportEstimate);
    const activities = readEstimate(activityEstimate);

    // These calculations intentionally mirror the main BudgetBreakdown.
    const minimumTotal =
        flightCost + hotelCost + food.min + transport.min + activities.min;
    const maximumTotal =
        flightCost + hotelCost + food.max + transport.max + activities.max;

    const remainingAtHighEstimate = safeBudget - maximumTotal;
    const remainingAtLowEstimate = safeBudget - minimumTotal;
    const fitsBudget = maximumTotal <= safeBudget;
    const hasSelections = Boolean(outbound || returnFlight || hotel);
    const budgetUsage = safeBudget > 0
        ? Math.min(100, Math.max(0, (maximumTotal / safeBudget) * 100))
        : 0;

    return (
        <aside className="sticky top-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-900">Your Trip Cart</h2>
                        <p className="mt-1 text-sm text-slate-500">Live estimate based on your selections</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <Wallet size={20} />
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                        <Users size={13} /> {safeTravellers} traveller{safeTravellers === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
                        Budget {formatINR(safeBudget)}
                    </span>
                </div>
            </div>

            <div className="max-h-[52vh] overflow-y-auto px-5 py-2">
                <CartRow
                    icon={Plane}
                    title="Flights"
                    subtitle={returnFlight ? "Selected round-trip itinerary" : outbound ? "Outbound selected; return not selected" : "Choose your flight"}
                    value={outbound || returnFlight ? formatINR(flightCost) : "Not selected"}
                    tone="blue"
                />
                <CartRow
                    icon={Hotel}
                    title="Hotel"
                    subtitle={hotel ? `${hotel.name || "Selected hotel"} · ${safeNights} night${safeNights === 1 ? "" : "s"}` : "Choose a hotel to calculate stay cost"}
                    value={hotel ? formatINR(hotelCost) : "Not selected"}
                    tone="violet"
                />
                <CartRow
                    icon={Utensils}
                    title="Food estimate"
                    subtitle="Estimated for your trip and selected restaurants"
                    value={formatRange(food)}
                    tone="amber"
                />
                <CartRow
                    icon={CarFront}
                    title="Local transport"
                    subtitle="Estimated travel around your selected places"
                    value={formatRange(transport)}
                    tone="slate"
                />
                <CartRow
                    icon={Ticket}
                    title="Activities"
                    subtitle="Estimated entry fees and activities"
                    value={formatRange(activities)}
                    tone="amber"
                />
            </div>

            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-500">Projected trip cost</p>
                        <p className="mt-1 text-xl font-extrabold leading-7 text-slate-900">
                            {formatINR(minimumTotal)} – {formatINR(maximumTotal)}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        Estimate
                    </span>
                </div>

                {safeBudget > 0 && (
                    <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-slate-500">Budget used (high estimate)</span>
                            <span className="font-extrabold text-slate-700">{Math.round(budgetUsage)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className={`h-full rounded-full transition-all ${fitsBudget ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width: `${budgetUsage}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className={`mt-4 rounded-2xl border p-4 ${fitsBudget ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
                    <div className={`flex items-start gap-2.5 ${fitsBudget ? "text-emerald-700" : "text-rose-700"}`}>
                        {fitsBudget ? <CheckCircle2 size={19} className="mt-0.5 shrink-0" /> : <AlertTriangle size={19} className="mt-0.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-extrabold">
                                {fitsBudget ? "Your trip fits the budget" : "Your trip may exceed the budget"}
                            </p>
                            {fitsBudget ? (
                                <>
                                    <p className="mt-1 text-sm leading-5">
                                        {formatINR(remainingAtHighEstimate)} or more should remain using the higher estimate.
                                    </p>
                                    {remainingAtLowEstimate !== remainingAtHighEstimate && (
                                        <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                                            Possible remaining range: {formatINR(remainingAtHighEstimate)} – {formatINR(remainingAtLowEstimate)}.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="mt-1 text-sm leading-5">
                                    The high estimate is {formatINR(Math.max(0, maximumTotal - safeBudget))} above your budget.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-400">
                    Estimates can change. Confirm flight and hotel prices, taxes, tickets, meals and local transport before booking.
                </p>
            </div>
        </aside>
    );
}
