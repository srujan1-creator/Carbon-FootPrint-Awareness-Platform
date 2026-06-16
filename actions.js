/**
 * Actions & Recommendations Library
 * Houses the actions database and recommendation engine.
 * CO2 savings are in kg CO2e/year.
 */

export const ACTIONS_DATABASE = [
  // --- ENERGY ACTIONS ---
  {
    id: "switch_to_leds",
    category: "energy",
    title: "Switch to LED Bulbs",
    description: "Replace standard incandescent light bulbs with energy-efficient LEDs.",
    co2Savings: 150,
    difficulty: "Easy",
    cost: "Low",
    impact: "Low"
  },
  {
    id: "lower_thermostat",
    category: "energy",
    title: "Lower Thermostat by 2°C",
    description: "Lower your heating thermostat in winter or raise air conditioning in summer.",
    co2Savings: 340,
    difficulty: "Easy",
    cost: "Free",
    impact: "Medium"
  },
  {
    id: "cold_wash",
    category: "energy",
    title: "Cold Water Laundry",
    description: "Wash clothes in cold water (30°C or lower) and air-dry them when possible.",
    co2Savings: 75,
    difficulty: "Easy",
    cost: "Free",
    impact: "Low"
  },
  {
    id: "unplug_vampires",
    category: "energy",
    title: "Kill Vampire Power",
    description: "Unplug chargers, TVs, and standby devices or use smart power strips.",
    co2Savings: 80,
    difficulty: "Easy",
    cost: "Free/Low",
    impact: "Low"
  },
  {
    id: "solar_panels",
    category: "energy",
    title: "Install Solar Panels",
    description: "Equip your home with solar photovoltaics to generate clean electricity.",
    co2Savings: 1500,
    difficulty: "Hard",
    cost: "High",
    impact: "High"
  },

  // --- TRANSPORT ACTIONS ---
  {
    id: "bike_commute",
    category: "transport",
    title: "Bike or Walk for Short Trips",
    description: "Walk or ride a bike for all trips under 5 kilometers instead of driving.",
    co2Savings: 450,
    difficulty: "Medium",
    cost: "Free",
    impact: "Medium"
  },
  {
    id: "carpool",
    category: "transport",
    title: "Carpool to Work",
    description: "Carpool with colleagues or friends 2-3 times a week to share fuel costs.",
    co2Savings: 600,
    difficulty: "Easy",
    cost: "Free",
    impact: "Medium"
  },
  {
    id: "public_transit",
    category: "transport",
    title: "Switch to Public Transit",
    description: "Commute by train, subway, or bus rather than driving a personal vehicle.",
    co2Savings: 1200,
    difficulty: "Medium",
    cost: "Medium",
    impact: "High"
  },
  {
    id: "flight_reduction",
    category: "transport",
    title: "Fly Less, Explore Closer",
    description: "Replace one long-haul return flight per year with train travel, local tourism, or virtual meetings.",
    co2Savings: 1600,
    difficulty: "Medium",
    cost: "Free",
    impact: "High"
  },
  {
    id: "eco_driving",
    category: "transport",
    title: "Practice Eco-Driving",
    description: "Drive smoothly, maintain correct tire pressure, and avoid excessive idling to save fuel.",
    co2Savings: 150,
    difficulty: "Easy",
    cost: "Free",
    impact: "Low"
  },

  // --- FOOD ACTIONS ---
  {
    id: "meatless_mondays",
    category: "food",
    title: "Go Meatless Once a Week",
    description: "Eat plant-based meals one day per week, reducing red meat consumption.",
    co2Savings: 250,
    difficulty: "Easy",
    cost: "Free",
    impact: "Low"
  },
  {
    id: "plant_based_diet",
    category: "food",
    title: "Adopt a Plant-Based Diet",
    description: "Transition to a fully vegetarian or vegan diet to minimize agriculture impact.",
    co2Savings: 1100,
    difficulty: "Hard",
    cost: "Free/Low",
    impact: "High"
  },
  {
    id: "zero_food_waste",
    category: "food",
    title: "Target Zero Food Waste",
    description: "Plan meals in advance, store food correctly, and freeze leftovers to prevent waste.",
    co2Savings: 150,
    difficulty: "Easy",
    cost: "Free",
    impact: "Low"
  },
  {
    id: "buy_local",
    category: "food",
    title: "Buy Local & Seasonal Food",
    description: "Source food locally to lower transport miles (food miles) and packaging emissions.",
    co2Savings: 100,
    difficulty: "Easy",
    cost: "Medium",
    impact: "Low"
  },

  // --- WASTE ACTIONS ---
  {
    id: "composting",
    category: "waste",
    title: "Compost Organic Waste",
    description: "Compost organic food scraps to avoid methane generation in anaerobic landfills.",
    co2Savings: 110,
    difficulty: "Medium",
    cost: "Low",
    impact: "Low"
  },
  {
    id: "zero_single_use",
    category: "waste",
    title: "Refuse Single-Use Plastics",
    description: "Use reusable grocery bags, water bottles, and reusable coffee cups.",
    co2Savings: 50,
    difficulty: "Easy",
    cost: "Low",
    impact: "Low"
  },
  {
    id: "rigorous_recycling",
    category: "waste",
    title: "Recycle Thoroughly",
    description: "Actively recycle cardboard, plastic containers, glass bottles, and metal cans.",
    co2Savings: 200,
    difficulty: "Easy",
    cost: "Free",
    impact: "Medium"
  },
  {
    id: "secondhand_shopping",
    category: "waste",
    title: "Shop Secondhand / Repair",
    description: "Buy clothes, furniture, and devices pre-owned, and repair broken items before replacing.",
    co2Savings: 300,
    difficulty: "Medium",
    cost: "Low",
    impact: "Medium"
  }
];

/**
 * Recommends actions to the user based on their carbon breakdown.
 * Sorts action categories by the user's highest emission categories first,
 * then orders within those categories.
 * @param {Object} breakdown - Breakdown values from calculator.js (e.g. { energy: X, transport: Y, food: Z, waste: W })
 * @returns {Array} - Array of action objects sorted by priority.
 */
export function getRecommendedActions(breakdown) {
  // Sort category keys from highest emission to lowest
  const sortedCategories = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Map database actions into prioritized list
  const recommended = [];
  
  // First, add all actions belonging to the highest category
  // Then the next category, and so on.
  sortedCategories.forEach(category => {
    const categoryActions = ACTIONS_DATABASE.filter(action => action.category === category);
    recommended.push(...categoryActions);
  });

  return recommended;
}
