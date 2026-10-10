function calculateFoodEstimate({
  restaurants,
  travellers,
  tripDays,
}) {
  if (!restaurants.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  const averageMealCost =
    restaurants.reduce(
      (sum, restaurant) =>
        sum + restaurant.mealEstimatePerPerson,
      0
    ) / restaurants.length;

  /*
    3 meals/day.

    We intentionally use a range because restaurant
    prices are estimates, not guaranteed spending.
  */

  const baseCost =
    averageMealCost *
    travellers *
    tripDays *
    3;

  return {
    min: Math.round(baseCost * 0.8),
    max: Math.round(baseCost * 1.2),
  };
}

function calculateTransportEstimate({
  selectedPlaces,
  travellers,
}) {
  if (!selectedPlaces.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  /*
    Temporary mock calculation.

    Later this will be replaced using actual distances/routes
    from the selected hotel to the selected places.
  */

  const perPlaceMin = 150;
  const perPlaceMax = 300;

  const min =
    selectedPlaces.length *
    perPlaceMin;

  const max =
    selectedPlaces.length *
    perPlaceMax;

  return {
    min: Math.round(
      min * Math.max(1, travellers / 2)
    ),
    max: Math.round(
      max * Math.max(1, travellers / 2)
    ),
  };
}

function calculateActivityEstimate({
  selectedPlaces,
}) {
  if (!selectedPlaces.length) {
    return {
      min: 0,
      max: 0,
    };
  }

  /*
    Not every attraction has an entry fee.

    Until we receive actual ticket/price information,
    we'll use a broad allowance rather than pretending
    every place has a fixed cost.
  */

  const perPlaceMin = 100;
  const perPlaceMax = 300;

  return {
    min:
      selectedPlaces.length *
      perPlaceMin,

    max:
      selectedPlaces.length *
      perPlaceMax,
  };
}

export {
  calculateFoodEstimate,
  calculateTransportEstimate,
  calculateActivityEstimate,
};