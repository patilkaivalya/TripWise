import { useState } from "react";
import {
  CalendarDays,
  IndianRupee,
  Sparkles,
  Users,
  Loader2,
} from "lucide-react";

import {
  getFlightLocationSuggestions,
} from "../services/api";

import LocationAutocomplete from "./LocationAutocomplete";


// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------

const MIN_BUDGET = 2000;
const MAX_BUDGET = 500000;

const MIN_TRAVELLERS = 1;
const MAX_TRAVELLERS = 20;

const MIN_TRIP_NIGHTS = 2;


// ---------------------------------------------------------
// Interests
// ---------------------------------------------------------

const interests = [
  { id: "beaches", label: "Beaches", emoji: "🏖️" },
  { id: "food", label: "Food", emoji: "🍴" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "adventure", label: "Adventure", emoji: "🥾" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
];


// ---------------------------------------------------------
// Date helpers
// ---------------------------------------------------------

function formatDateForInput(date) {
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().split("T")[0];
}


function addDays(dateString, days) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  date.setDate(date.getDate() + days);

  return formatDateForInput(date);
}


function calculateTripNights(start, end) {
  if (!start || !end) {
    return null;
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  const difference =
    endDate.getTime() - startDate.getTime();

  return Math.round(
    difference / (1000 * 60 * 60 * 24)
  );
}


// ---------------------------------------------------------
// Component
// ---------------------------------------------------------

function TripForm() {

  const today = formatDateForInput(new Date());

  const [formData, setFormData] = useState({
    from: "",
    fromLocation: null,

    destination: "",
    destinationLocation: null,

    departure: "",
    returnDate: "",

    budget: "",
    travellers: 1,

    interests: [],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const minReturnDate = formData.departure
    ? addDays(
        formData.departure,
        MIN_TRIP_NIGHTS
      )
    : today;

  const tripNights = calculateTripNights(
    formData.departure,
    formData.returnDate
  );


  // -------------------------------------------------------
  // Normal input changes
  // -------------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };


  // -------------------------------------------------------
  // Interest selection
  // -------------------------------------------------------

  const toggleInterest = (interestId) => {
    setFormData((previous) => {
      const alreadySelected =
        previous.interests.includes(interestId);

      const updatedInterests = alreadySelected
        ? previous.interests.filter(
            (id) => id !== interestId
          )
        : [
            ...previous.interests,
            interestId,
          ];

      return {
        ...previous,
        interests: updatedInterests,
      };
    });

    setError("");
  };


  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    console.log(
      "TRIPWISE FORM DATA:",
      formData
    );


    // -----------------------------------------------------
    // Location validation
    // -----------------------------------------------------

    if (!formData.fromLocation) {
      setError(
        "Please select a departure location from the suggestions."
      );
      return;
    }

    if (!formData.destinationLocation) {
      setError(
        "Please select a destination from the suggestions."
      );
      return;
    }


    // Check whether both selected locations are the same.
    const samePlace =
      formData.fromLocation.dataId &&
      formData.destinationLocation.dataId
        ? formData.fromLocation.dataId ===
          formData.destinationLocation.dataId
        : formData.fromLocation.latitude ===
            formData.destinationLocation.latitude &&
          formData.fromLocation.longitude ===
            formData.destinationLocation.longitude;

    if (samePlace) {
      setError(
        "Departure and destination cannot be the same place."
      );
      return;
    }


    // -----------------------------------------------------
    // Date validation
    // -----------------------------------------------------

    if (!formData.departure) {
      setError(
        "Please select your departure date."
      );
      return;
    }

    if (!formData.returnDate) {
      setError(
        "Please select your return date."
      );
      return;
    }

    if (formData.departure < today) {
      setError(
        "Departure date cannot be in the past."
      );
      return;
    }

    if (
      formData.returnDate <
      formData.departure
    ) {
      setError(
        "Return date cannot be before departure date."
      );
      return;
    }

    const nights = calculateTripNights(
      formData.departure,
      formData.returnDate
    );

    if (
      nights === null ||
      nights < MIN_TRIP_NIGHTS
    ) {
      setError(
        "Your trip must be at least 2 nights (3 calendar days)."
      );
      return;
    }


    // -----------------------------------------------------
    // Budget validation
    // -----------------------------------------------------

    if (!formData.budget) {
      setError(
        "Please enter your total trip budget."
      );
      return;
    }

    const budget = Number(formData.budget);

    if (Number.isNaN(budget)) {
      setError(
        "Please enter a valid budget."
      );
      return;
    }

    if (budget < MIN_BUDGET) {
      setError(
        `Budget must be at least ₹${MIN_BUDGET.toLocaleString(
          "en-IN"
        )}.`
      );
      return;
    }

    if (budget > MAX_BUDGET) {
      setError(
        `Budget cannot exceed ₹${MAX_BUDGET.toLocaleString(
          "en-IN"
        )}.`
      );
      return;
    }


    // -----------------------------------------------------
    // Traveller validation
    // -----------------------------------------------------

    const travellers = Number(
      formData.travellers
    );

    if (
      travellers < MIN_TRAVELLERS ||
      travellers > MAX_TRAVELLERS
    ) {
      setError(
        `Number of travellers must be between ${MIN_TRAVELLERS} and ${MAX_TRAVELLERS}.`
      );
      return;
    }


    // -----------------------------------------------------
    // Resolve flight locations
    // -----------------------------------------------------

    try {
      setLoading(true);

      console.log(
        "Resolving departure airport..."
      );

      const originSuggestions =
        await getFlightLocationSuggestions(
          formData.from
        );

      console.log(
        "Origin flight locations:",
        originSuggestions
      );


      console.log(
        "Resolving destination airport..."
      );

      const destinationSuggestions =
        await getFlightLocationSuggestions(
          formData.destination
        );

      console.log(
        "Destination flight locations:",
        destinationSuggestions
      );


      // ---------------------------------------------------
      // Check origin
      // ---------------------------------------------------

      if (
        !originSuggestions ||
        originSuggestions.length === 0
      ) {
        setError(
          `Could not find a flight location for "${formData.from}".`
        );
        return;
      }


      // ---------------------------------------------------
      // Check destination
      // ---------------------------------------------------

      if (
        !destinationSuggestions ||
        destinationSuggestions.length === 0
      ) {
        setError(
          `Could not find a flight location for "${formData.destination}".`
        );
        return;
      }


      // ---------------------------------------------------
      // Choose city-level result
      // ---------------------------------------------------

      const originLocation =
        originSuggestions.find(
          (item) => item.type === "city"
        ) || originSuggestions[0];

      const destinationLocation =
        destinationSuggestions.find(
          (item) => item.type === "city"
        ) || destinationSuggestions[0];


      // ---------------------------------------------------
      // Choose first available airport
      // ---------------------------------------------------

      const originAirport =
        originLocation.airports?.[0];

      const destinationAirport =
        destinationLocation.airports?.[0];


      // ---------------------------------------------------
      // Validate airports
      // ---------------------------------------------------

      if (!originAirport?.iataCode) {
        setError(
          `No airport found for "${formData.from}".`
        );
        return;
      }

      if (!destinationAirport?.iataCode) {
        setError(
          `No airport found for "${formData.destination}".`
        );
        return;
      }


      // ---------------------------------------------------
      // Final trip object
      // ---------------------------------------------------

      const validatedTrip = {
        ...formData,

        budget,
        travellers,
        tripNights: nights,

        flightOrigin: {
          name: originLocation.name,

          cityId:
            originLocation.flightLocationId,

          airport:
            originAirport.name,

          iataCode:
            originAirport.iataCode,
        },

        flightDestination: {
          name:
            destinationLocation.name,

          cityId:
            destinationLocation.flightLocationId,

          airport:
            destinationAirport.name,

          iataCode:
            destinationAirport.iataCode,
        },
      };


      console.log(
        "FINAL TRIP DATA:",
        validatedTrip
      );


      // ---------------------------------------------------
      // Save trip temporarily
      // ---------------------------------------------------

      sessionStorage.setItem(
        "tripwiseTrip",
        JSON.stringify(validatedTrip)
      );


      // ---------------------------------------------------
      // Go to Results
      // ---------------------------------------------------

      window.location.href = "/results";

    } catch (error) {
      console.error(
        "Flight location resolution failed:",
        error
      );

      setError(
        "Unable to find airports for your selected locations. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };


  // -------------------------------------------------------
  // UI
  // -------------------------------------------------------

  return (
    <section
      id="planner"
      className="relative z-10 -mt-8 mx-auto max-w-5xl px-5 pb-16 lg:px-8"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">

        {/* Heading */}

        <div className="mb-7">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Start planning
          </p>

          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Tell us about your trip
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your route, travel dates, budget and
            interests. We'll use this information to
            build your trip plan.
          </p>
        </div>


        <form
          onSubmit={handleSubmit}
          className="space-y-7"
        >

          {/* Locations */}

          <div className="grid gap-5 md:grid-cols-2">

            {/* From */}

            <div>
              <LocationAutocomplete
                label="From"
                value={formData.from}

                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    from: value,
                    fromLocation: null,
                  }))
                }

                onSelect={(place) =>
                  setFormData((previous) => ({
                    ...previous,
                    from: place.name,
                    fromLocation: place,
                  }))
                }

                placeholder="Search departure city"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Start typing to search for a location
              </p>
            </div>


            {/* Destination */}

            <div>
              <LocationAutocomplete
                label="Destination"
                value={formData.destination}

                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    destination: value,
                    destinationLocation: null,
                  }))
                }

                onSelect={(place) =>
                  setFormData((previous) => ({
                    ...previous,
                    destination: place.name,
                    destinationLocation: place,
                  }))
                }

                placeholder="Where do you want to go?"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                You can search for destinations anywhere
              </p>
            </div>

          </div>


          {/* Dates */}

          <div className="grid gap-5 md:grid-cols-2">

            {/* Departure */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Departure
              </label>

              <div className="relative">
                <CalendarDays
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  name="departure"
                  value={formData.departure}
                  min={today}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Departure cannot be in the past
              </p>
            </div>


            {/* Return */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Return
              </label>

              <div className="relative">
                <CalendarDays
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="date"
                  name="returnDate"
                  value={formData.returnDate}
                  min={minReturnDate}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Minimum trip: 2 nights
              </p>
            </div>

          </div>


          {/* Trip duration */}

          {tripNights !== null &&
            tripNights >= 0 && (
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                {tripNights} night
                {tripNights !== 1 ? "s" : ""} ·{" "}
                {tripNights + 1} calendar day
                {tripNights + 1 !== 1
                  ? "s"
                  : ""}
              </div>
            )}


          {/* Budget + Travellers */}

          <div className="grid gap-5 md:grid-cols-2">

            {/* Budget */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Total Budget
              </label>

              <div className="relative">
                <IndianRupee
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  name="budget"
                  min={MIN_BUDGET}
                  max={MAX_BUDGET}
                  step="500"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="e.g. 15000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                ₹2,000 to ₹5,00,000 per trip
              </p>
            </div>


            {/* Travellers */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Travellers
              </label>

              <div className="relative">
                <Users
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  name="travellers"
                  min={MIN_TRAVELLERS}
                  max={MAX_TRAVELLERS}
                  value={formData.travellers}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                1 to 20 travellers
              </p>
            </div>

          </div>


          {/* Interests */}

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              What are you interested in?
            </label>

            <div className="flex flex-wrap gap-2.5">

              {interests.map((interest) => {
                const selected =
                  formData.interests.includes(
                    interest.id
                  );

                return (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() =>
                      toggleInterest(
                        interest.id
                      )
                    }
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="mr-1.5">
                      {interest.emoji}
                    </span>

                    {interest.label}
                  </button>
                );
              })}

            </div>
          </div>


          {/* Error */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}


          {/* Submit */}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 hover:shadow-xl active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />

                Finding flights...
              </>
            ) : (
              <>
                <Sparkles size={19} />

                Plan My Trip
              </>
            )}
          </button>

        </form>

      </div>
    </section>
  );
}

export default TripForm;