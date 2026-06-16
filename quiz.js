/**
 * Carbon Literacy Quiz Database and Engine
 */

export const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Which transportation method produces the most greenhouse gas emissions per passenger-kilometer?",
    options: [
      "Urban Transit Bus",
      "Electric Car (average grid)",
      "Petrol Sedan Car",
      "Domestic Airplane Flight"
    ],
    correctAnswer: 3,
    explanation: "Domestic flights produce the highest emissions per passenger-km due to fuel consumption during takeoff and radiative forcing at high altitudes. A flight is roughly double the carbon intensity of driving alone in a petrol car."
  },
  {
    id: 2,
    question: "Approximately what percentage of global greenhouse gas emissions comes from food production and agriculture?",
    options: [
      "Around 5%",
      "Around 12%",
      "Around 26%",
      "Over 50%"
    ],
    correctAnswer: 2,
    explanation: "According to research (e.g., Our World in Data), food systems are responsible for about 26% of global greenhouse gas emissions. This includes land use, crop production, livestock, and supply chain logistics."
  },
  {
    id: 3,
    question: "Which food source has the largest carbon footprint per gram of protein?",
    options: [
      "Beef (beef herd)",
      "Chicken",
      "Tofu (soy)",
      "Eggs"
    ],
    correctAnswer: 0,
    explanation: "Beef has by far the highest emissions—averaging nearly 50kg of CO2e per 100g of protein. This is due to enteric fermentation (methane from cows), land-use changes, feed production, and slow reproduction rates."
  },
  {
    id: 4,
    question: "What does 'Vampire Power' mean in the context of household energy?",
    options: [
      "Energy consumed by outdoor security lights at night",
      "Electricity drawn by devices plugged in but on standby or turned off",
      "Power surges during lightning storms",
      "Clean electricity generated during full moons"
    ],
    correctAnswer: 1,
    explanation: "Vampire power (or standby power) is the energy consumed by appliances when they are switched off but still plugged in. It accounts for about 5% to 10% of household electricity usage globally."
  },
  {
    id: 5,
    question: "Composting food waste is vital because throwing organic waste into standard landfills releases which potent gas?",
    options: [
      "Carbon Dioxide",
      "Methane",
      "Nitrous Oxide",
      "Sulphur Dioxide"
    ],
    correctAnswer: 1,
    explanation: "When organic waste is buried in landfills, it decomposes anaerobically (without oxygen), generating methane (CH4). Methane is a potent greenhouse gas that is 28-36 times more warming than CO2 over a 100-year timescale. Composting decomposes waste aerobically, releasing minimal biogenic CO2 instead."
  },
  {
    id: 6,
    question: "Washing clothes in cold water (30°C or below) compared to hot washes (60°C) saves roughly how much energy?",
    options: [
      "Saves about 10% energy",
      "Saves about 25% energy",
      "Saves about 50% energy",
      "Saves about 75% to 90% energy"
    ],
    correctAnswer: 3,
    explanation: "About 75% to 90% of the energy consumed by a washing machine goes solely into heating the water. Washing at 30°C or below drastically reduces electricity bills and carbon emissions."
  },
  {
    id: 7,
    question: "What is the primary temperature goal of the international Paris Climate Agreement?",
    options: [
      "Transition completely to renewable energy by 2040",
      "Limit global warming to well below 2.0°C, preferably to 1.5°C, compared to pre-industrial levels",
      "Establish a global uniform carbon tax of $50 per ton",
      "Achieve zero waste in all OECD countries by 2030"
    ],
    correctAnswer: 1,
    explanation: "The Paris Agreement's central goal is to limit global average temperature increases to well below 2°C, and pursue efforts to cap the rise at 1.5°C to prevent catastrophic environmental tipping points."
  },
  {
    id: 8,
    question: "Which milk alternative has the lowest overall environmental footprint (emissions, land, and water use combined)?",
    options: [
      "Dairy Milk",
      "Almond Milk",
      "Soy Milk",
      "Oat Milk"
    ],
    correctAnswer: 3,
    explanation: "While all plant-based milks are significantly better than dairy milk, oat milk combines low greenhouse gas emissions, low land use, and extremely low water usage (unlike almond milk, which is water-intensive)."
  },
  {
    id: 9,
    question: "What is the global average carbon footprint per person per year?",
    options: [
      "About 1.2 tonnes CO2e",
      "About 4.7 tonnes CO2e",
      "About 10.5 tonnes CO2e",
      "About 16.0 tonnes CO2e"
    ],
    correctAnswer: 1,
    explanation: "The global average is about 4.7 tonnes of CO2e per person. However, averages vary widely by region, with the US at ~16 tonnes, Europe at ~6.5 tonnes, and India at ~1.9 tonnes."
  },
  {
    id: 10,
    question: "To limit global warming to 1.5°C, what is the target sustainable carbon footprint per person by 2030?",
    options: [
      "Under 5.0 tonnes CO2e",
      "Under 3.5 tonnes CO2e",
      "Under 2.0 tonnes CO2e",
      "Zero footprint (completely carbon neutral)"
    ],
    correctAnswer: 2,
    explanation: "To stay on track for a stable climate, the global average per-capita footprint needs to fall to under 2.0 tonnes of CO2e per year by 2030. This is the sustainability threshold."
  }
];

export class QuizSession {
  constructor() {
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.userAnswers = []; // records index of selected option for each question
    this.completed = false;
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex < QUIZ_QUESTIONS.length) {
      return QUIZ_QUESTIONS[this.currentQuestionIndex];
    }
    return null;
  }

  submitAnswer(selectedOptionIndex) {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return false;

    this.userAnswers.push(selectedOptionIndex);
    const isCorrect = (selectedOptionIndex === currentQuestion.correctAnswer);
    if (isCorrect) {
      this.score++;
    }

    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= QUIZ_QUESTIONS.length) {
      this.completed = true;
    }

    return isCorrect;
  }

  reset() {
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.userAnswers = [];
    this.completed = false;
  }

  getPercentScore() {
    return Math.round((this.score / QUIZ_QUESTIONS.length) * 100);
  }
}
