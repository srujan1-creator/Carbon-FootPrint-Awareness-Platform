/**
 * Carbon Footprint Calculation Engine
 * Coefficients and formulas based on EPA, DEFRA, and IPCC guidelines.
 * All outputs are in kilograms of CO2 equivalent (kg CO2e) per year.
 */

// Emission Factors (Constants)
export const COEFFICIENTS = {
  // Home Energy
  electricity: 0.389,      // kg CO2e per kWh (EPA eGRID average)
  naturalGas: 0.181,       // kg CO2e per kWh
  naturalGasTherm: 5.3,    // kg CO2e per Therm
  heatingOil: 2.68,        // kg CO2e per Liter

  // Transportation (Cars: kg CO2e per km)
  carFuel: {
    petrol: 0.170,
    diesel: 0.171,
    hybrid: 0.100,
    electric: 0.045        // Assuming average grid mix charging
  },

  // Public Transit (kg CO2e per km)
  transit: {
    bus: 0.096,
    train: 0.035
  },

  // Flights (kg CO2e per return flight)
  flights: {
    shortHaul: 300,        // < 1500 km (approx 150kg one-way)
    longHaul: 1600         // > 1500 km (approx 800kg one-way)
  },

  // Diet Type (kg CO2e per year per person)
  diet: {
    heavyMeat: 2500,       // High meat consumption (> 100g/day)
    averageMeat: 1800,     // Moderate meat consumption (50-100g/day)
    lowMeat: 1200,         // Low meat/flexitarian (< 50g/day)
    vegetarian: 900,       // No meat, includes dairy/eggs
    vegan: 600             // No animal products
  },

  // Food Waste (kg CO2e per year per person)
  foodWaste: {
    low: 0,
    medium: 150,
    high: 400
  },

  // Waste (kg CO2e per bag of landfill trash)
  wastePerBag: 2.0,        // kg CO2e per standard household bag (approx 5kg landfill waste)
  weeksPerYear: 52,

  // Recycling reductions (percentage saved from waste emissions)
  recyclingReduction: {
    none: 0.0,
    partial: 0.25,         // Recycling 1-2 categories (e.g. only paper/plastic)
    full: 0.50             // Active recycling of paper, plastic, glass, and metal
  }
};

/**
 * Calculates yearly emissions from home energy consumption.
 * @param {Object} inputs
 * @param {number} inputs.electricityKwh - Monthly electricity usage (kWh)
 * @param {number} inputs.cleanEnergyShare - Percentage of electricity from green/clean sources (0-100)
 * @param {number} inputs.gasKwh - Monthly natural gas usage in kWh (or 0 if using therms)
 * @param {number} inputs.gasTherms - Monthly natural gas usage in Therms (or 0 if using kWh)
 * @param {number} inputs.heatingOilLiters - Monthly heating oil usage (Liters)
 * @param {number} inputs.householdMembers - Number of people in the household
 * @returns {Object} { total, electricity, gas, heatingOil } (all values in kg CO2e/year, per person)
 */
export function calculateEnergyFootprint({
  electricityKwh = 0,
  cleanEnergyShare = 0,
  gasKwh = 0,
  gasTherms = 0,
  heatingOilLiters = 0,
  householdMembers = 1
}) {
  const members = Math.max(1, householdMembers);
  
  // Calculate yearly totals for household
  const cleanMultiplier = 1 - (Math.min(100, Math.max(0, cleanEnergyShare)) / 100);
  const yearlyElectricity = (electricityKwh * 12) * COEFFICIENTS.electricity * cleanMultiplier;
  
  const gasEmissionFactor = gasTherms > 0 ? COEFFICIENTS.naturalGasTherm : COEFFICIENTS.naturalGas;
  const gasAmount = gasTherms > 0 ? gasTherms : gasKwh;
  const yearlyGas = (gasAmount * 12) * gasEmissionFactor;
  
  const yearlyHeatingOil = (heatingOilLiters * 12) * COEFFICIENTS.heatingOil;
  
  // Divide by household members to get individual share
  const electricityShare = yearlyElectricity / members;
  const gasShare = yearlyGas / members;
  const heatingOilShare = yearlyHeatingOil / members;
  const total = electricityShare + gasShare + heatingOilShare;

  return {
    total: Math.round(total),
    electricity: Math.round(electricityShare),
    gas: Math.round(gasShare),
    heatingOil: Math.round(heatingOilShare)
  };
}

/**
 * Calculates yearly emissions from transportation.
 * @param {Object} inputs
 * @param {number} inputs.carKmPerWeek - Weekly distance driven in car (km)
 * @param {string} inputs.carFuelType - Fuel type ('petrol', 'diesel', 'hybrid', 'electric')
 * @param {number} inputs.busKmPerWeek - Weekly distance by bus (km)
 * @param {number} inputs.trainKmPerWeek - Weekly distance by train (km)
 * @param {number} inputs.shortHaulFlights - Return short-haul flights per year
 * @param {number} inputs.longHaulFlights - Return long-haul flights per year
 * @returns {Object} { total, car, publicTransit, flights } (all values in kg CO2e/year)
 */
export function calculateTransportationFootprint({
  carKmPerWeek = 0,
  carFuelType = 'petrol',
  busKmPerWeek = 0,
  trainKmPerWeek = 0,
  shortHaulFlights = 0,
  longHaulFlights = 0
}) {
  // Car emissions
  const fuelFactor = COEFFICIENTS.carFuel[carFuelType] || COEFFICIENTS.carFuel.petrol;
  const carYearly = carKmPerWeek * 52 * fuelFactor;

  // Public transit emissions
  const busYearly = busKmPerWeek * 52 * COEFFICIENTS.transit.bus;
  const trainYearly = trainKmPerWeek * 52 * COEFFICIENTS.transit.train;
  const transitYearly = busYearly + trainYearly;

  // Flight emissions
  const flightYearly = (shortHaulFlights * COEFFICIENTS.flights.shortHaul) +
                       (longHaulFlights * COEFFICIENTS.flights.longHaul);

  const total = carYearly + transitYearly + flightYearly;

  return {
    total: Math.round(total),
    car: Math.round(carYearly),
    publicTransit: Math.round(transitYearly),
    flights: Math.round(flightYearly)
  };
}

/**
 * Calculates yearly emissions from food and diet.
 * @param {Object} inputs
 * @param {string} inputs.dietType - Diet type ('heavyMeat', 'averageMeat', 'lowMeat', 'vegetarian', 'vegan')
 * @param {string} inputs.foodWasteLevel - Food waste level ('low', 'medium', 'high')
 * @returns {Object} { total, diet, foodWaste } (all values in kg CO2e/year)
 */
export function calculateFoodFootprint({
  dietType = 'averageMeat',
  foodWasteLevel = 'medium'
}) {
  const dietEmission = COEFFICIENTS.diet[dietType] || COEFFICIENTS.diet.averageMeat;
  const wasteEmission = COEFFICIENTS.foodWaste[foodWasteLevel] || COEFFICIENTS.foodWaste.medium;
  const total = dietEmission + wasteEmission;

  return {
    total: Math.round(total),
    diet: Math.round(dietEmission),
    foodWaste: Math.round(wasteEmission)
  };
}

/**
 * Calculates yearly emissions from household waste.
 * @param {Object} inputs
 * @param {number} inputs.wasteBagsPerWeek - Landfill waste bags thrown out weekly
 * @param {string} inputs.recyclingLevel - Recycling level ('none', 'partial', 'full')
 * @param {number} inputs.householdMembers - Number of people in household
 * @returns {Object} { total, grossWaste, recyclingSavings } (all values in kg CO2e/year, per person)
 */
export function calculateWasteFootprint({
  wasteBagsPerWeek = 2,
  recyclingLevel = 'partial',
  householdMembers = 1
}) {
  const members = Math.max(1, householdMembers);
  const yearlyHouseholdWasteEmissions = wasteBagsPerWeek * COEFFICIENTS.weeksPerYear * COEFFICIENTS.wastePerBag;
  
  const reductionPercentage = COEFFICIENTS.recyclingReduction[recyclingLevel] || COEFFICIENTS.recyclingReduction.none;
  const grossWasteShare = yearlyHouseholdWasteEmissions / members;
  const savingsShare = grossWasteShare * reductionPercentage;
  const total = grossWasteShare - savingsShare;

  return {
    total: Math.round(total),
    grossWaste: Math.round(grossWasteShare),
    recyclingSavings: Math.round(savingsShare)
  };
}

/**
 * Helper to calculate cumulative footprint and breakdown
 */
export function calculateTotalFootprint(energyInputs, transportInputs, foodInputs, wasteInputs) {
  const energy = calculateEnergyFootprint(energyInputs);
  const transport = calculateTransportationFootprint(transportInputs);
  const food = calculateFoodFootprint(foodInputs);
  const waste = calculateWasteFootprint({
    ...wasteInputs,
    householdMembers: energyInputs.householdMembers // share household members count
  });

  const total = energy.total + transport.total + food.total + waste.total;

  return {
    total,
    breakdown: {
      energy: energy.total,
      transport: transport.total,
      food: food.total,
      waste: waste.total
    },
    subBreakdown: {
      energyDetails: energy,
      transportDetails: transport,
      foodDetails: food,
      wasteDetails: waste
    }
  };
}

// Country comparison data (kg CO2e per capita per year)
export const COUNTRY_COMPARISONS = {
  globalAverage: 4700,    // Global average carbon footprint
  usaAverage: 16000,      // USA average carbon footprint
  ukAverage: 6500,        // UK average carbon footprint
  indiaAverage: 1900,     // India average carbon footprint
  climateTarget2030: 2000 // IPCC target footprint to limit warming to 1.5°C
};
