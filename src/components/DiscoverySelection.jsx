import {
  CheckCircle2,
  ChevronRight,
  MapPin,
  RefreshCw,
  Utensils,
} from "lucide-react";

import RestaurantOptionCard from "./RestaurantOptionCard";
import PlaceOptionCard from "./PlaceOptionCard";

const MAX_RESTAURANTS = 3;
const MAX_PLACES = 5;

function DiscoverySelection({
  restaurants = [],
  places = [],
  selectedRestaurants = [],
  selectedPlaces = [],
  onToggleRestaurant,
  onTogglePlace,
  loading = false,
  error = "",
  message = "",
  hotelName = "your selected hotel",
  radiusKm = 5,
  onRetry,
  onContinue,
}) {
  const canContinue =
    !loading && !error && (selectedRestaurants.length > 0 || selectedPlaces.length > 0);

  return (
    <section>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          Local discovery
        </p>

        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
          Make your trip yours
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Explore restaurants and attractions within {radiusKm} km of{" "}
          <span className="font-semibold text-slate-700">{hotelName}</span>.
          Choose the places you want to include in your trip.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="font-bold text-slate-800">
            Finding nearby restaurants and attractions...
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Checking ratings, reviews and distances from your hotel.
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && Boolean(error) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-bold text-red-800">
            Unable to load nearby places
          </p>
          <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={15} />
              Retry nearby search
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && restaurants.length === 0 && places.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <MapPin size={22} />
          </div>
          <p className="mt-4 font-bold text-slate-800">No nearby places found</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {message || "No suitable places with usable location data were found within the selected radius. Try another hotel."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={15} />
              Search again
            </button>
          )}
        </div>
      )}

      {/* Search result message, when some results exist */}
      {!loading && !error && (restaurants.length > 0 || places.length > 0) && message && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {message}
        </p>
      )}

      {!loading && !error && (restaurants.length > 0 || places.length > 0) && (
        <>
          {/* Restaurants */}
          <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <Utensils size={20} />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Food & Dining
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {restaurants.length > 0
                    ? `Choose up to ${MAX_RESTAURANTS} of ${restaurants.length} nearby restaurants.`
                    : "No suitable restaurants were found nearby."}
                </p>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
                {selectedRestaurants.length}/{MAX_RESTAURANTS} selected
              </span>
            </div>

            {restaurants.length > 0 ? (
              <div className="space-y-4">
                {restaurants.map((restaurant) => {
                  const selected = selectedRestaurants.some(
                    (item) => item.id === restaurant.id
                  );

                  return (
                    <RestaurantOptionCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      selected={selected}
                      recommended={restaurant.recommended}
                      onSelect={() => {
                        if (!selected && selectedRestaurants.length >= MAX_RESTAURANTS) {
                          alert(`You can select up to ${MAX_RESTAURANTS} restaurants.`);
                          return;
                        }
                        onToggleRestaurant(restaurant);
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                No suitable restaurants were returned within {radiusKm} km.
              </div>
            )}
          </div>

          {/* Places */}
          <div className="mt-12">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Places to Explore
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {places.length > 0
                    ? `Choose up to ${MAX_PLACES} of ${places.length} nearby attractions or experiences.`
                    : "No suitable attractions were found nearby."}
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
                {selectedPlaces.length}/{MAX_PLACES} selected
              </span>
            </div>

            {places.length > 0 ? (
              <div className="space-y-4">
                {places.map((place) => {
                  const selected = selectedPlaces.some(
                    (item) => item.id === place.id
                  );

                  return (
                    <PlaceOptionCard
                      key={place.id}
                      place={place}
                      selected={selected}
                      recommended={place.recommended}
                      onSelect={() => {
                        if (!selected && selectedPlaces.length >= MAX_PLACES) {
                          alert(`You can select up to ${MAX_PLACES} places.`);
                          return;
                        }
                        onTogglePlace(place);
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                No suitable attractions were returned within {radiusKm} km.
              </div>
            )}
          </div>

          {/* Continue */}
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={19}
                    className={canContinue ? "text-emerald-600" : "text-slate-300"}
                  />
                  <p className="font-bold text-slate-800">
                    {selectedRestaurants.length} restaurants · {selectedPlaces.length} places selected
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  We'll use your selections for the food estimate, transport estimate and final itinerary.
                </p>
              </div>

              <button
                type="button"
                disabled={!canContinue}
                onClick={onContinue}
                className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition ${
                  canContinue
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-400"
                }`}
              >
                Continue to Budget
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default DiscoverySelection;
