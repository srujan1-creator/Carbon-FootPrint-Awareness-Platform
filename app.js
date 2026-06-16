import { calculateTotalFootprint, COUNTRY_COMPARISONS } from './calculator.js';
import { ACTIONS_DATABASE, getRecommendedActions } from './actions.js';
import { QuizSession } from './quiz.js';
import { getGeminiResponse, getLocalFallbackResponse } from './ai.js';

// Application State
const STATE = {
  calculatorInputs: {
    energy: {
      electricityKwh: 250,
      cleanEnergyShare: 0,
      gasKwh: 150,
      gasTherms: 0,
      heatingOilLiters: 0,
      householdMembers: 1
    },
    transport: {
      carKmPerWeek: 120,
      carFuelType: 'petrol',
      busKmPerWeek: 20,
      trainKmPerWeek: 30,
      shortHaulFlights: 1,
      longHaulFlights: 0
    },
    food: {
      dietType: 'averageMeat',
      foodWasteLevel: 'medium'
    },
    waste: {
      wasteBagsPerWeek: 2,
      recyclingLevel: 'partial'
    }
  },
  activeActions: [], // Array of action IDs
  unlockedBadges: {}, // object mapping badgeId -> date string
  quizHighscore: 0,
  calculatedOnce: false,
  geminiApiKey: '',
  chatHistory: [] // conversational chat history
};

// Badges definition
export const BADGES = [
  {
    id: 'eco_pioneer',
    title: 'Eco Pioneer',
    desc: 'Calculate your carbon footprint for the first time.',
    icon: '🌱'
  },
  {
    id: 'low_carbon_hero',
    title: 'Low Carbon Hero',
    desc: 'Achieve a carbon footprint under the sustainable IPCC 2-tonne limit.',
    icon: '🦸‍♂️'
  },
  {
    id: 'commute_champ',
    title: 'Commute Champ',
    desc: 'Have a zero-car footprint or drive an electric vehicle.',
    icon: '🚲'
  },
  {
    id: 'green_foodie',
    title: 'Green Foodie',
    desc: 'Adopt a vegan or vegetarian diet.',
    icon: '🥗'
  },
  {
    id: 'recycling_ninja',
    title: 'Recycling Ninja',
    desc: 'Achieve full household recycling status.',
    icon: '♻️'
  },
  {
    id: 'goal_setter',
    title: 'Goal Setter',
    desc: 'Commit to at least 3 active carbon reduction goals.',
    icon: '🎯'
  },
  {
    id: 'carbon_cutter',
    title: 'Carbon Cutter',
    desc: 'Plan a CO2 savings total exceeding 1,000 kg per year.',
    icon: '✂️'
  },
  {
    id: 'quiz_master',
    title: 'Quiz Master',
    desc: 'Score 100% on the Carbon Literacy Quiz.',
    icon: '🎓'
  }
];

// Local variables
let chartInstance = null;
let quizSession = new QuizSession();
let activeCalcStep = 0;
let currentActionFilter = 'all';

// DOM Elements cache
const DOM = {
  navLinks: document.querySelectorAll('.nav-item button'),
  views: document.querySelectorAll('.view-section'),
  mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
  navMenu: document.getElementById('nav-menu'),
  
  // Calculator step panels & indicators
  calcStepPanels: document.querySelectorAll('.calc-step-panel'),
  calcStepDots: document.querySelectorAll('.step-dot'),
  calcStepTitle: document.getElementById('calc-step-title'),
  btnCalcPrev: document.getElementById('btn-calc-prev'),
  btnCalcNext: document.getElementById('btn-calc-next'),

  // Dashboard outputs
  footprintVal: document.getElementById('dashboard-footprint-value'),
  footprintCompText: document.getElementById('footprint-comparison-text'),
  footprintCompIcon: document.getElementById('footprint-comparison-icon'),
  dbCleanEnergyVal: document.getElementById('db-clean-energy-val'),
  dbCarKmVal: document.getElementById('db-car-km-val'),
  dbSavingsVal: document.getElementById('db-savings-value'),
  dbGoalsVal: document.getElementById('db-goals-value'),
  dbBadgesVal: document.getElementById('db-badges-value'),
  
  // Dashboard simulation & comparisons
  projectionSlider: document.getElementById('projection-year-slider'),
  projectionYearLabel: document.getElementById('projection-year-label'),
  projValBau: document.getElementById('proj-val-bau'),
  projValPlan: document.getElementById('proj-val-plan'),
  projValSaved: document.getElementById('proj-val-saved'),
  compBarUser: document.getElementById('comp-bar-user'),
  compBarUserVal: document.getElementById('comp-bar-user-val'),
  compBarTarget: document.getElementById('comp-bar-target'),
  compBarGlobal: document.getElementById('comp-bar-global'),
  compBarUsa: document.getElementById('comp-bar-usa'),
  dashboardTipTitle: document.getElementById('dashboard-tip-title'),
  dashboardTipDesc: document.getElementById('dashboard-tip-desc'),
  dashboardTipIcon: document.getElementById('dashboard-tip-icon'),

  // Live Calculator Preview
  calcLiveTotal: document.getElementById('calc-live-total'),
  calcLiveEnergy: document.getElementById('calc-live-energy'),
  calcLiveTransport: document.getElementById('calc-live-transport'),
  calcLiveFood: document.getElementById('calc-live-food'),
  calcLiveWaste: document.getElementById('calc-live-waste'),
  liveCompAlert: document.getElementById('live-comp-alert'),
  liveCompAlertText: document.getElementById('live-comp-alert-text'),

  // Action plan UI
  savingsMeterVal: document.getElementById('savings-meter-val'),
  actionFilters: document.getElementById('action-filters'),
  actionsList: document.getElementById('actions-list'),

  // Quiz UI
  quizPanel: document.getElementById('quiz-panel'),

  // Achievements
  achievementsList: document.getElementById('achievements-list'),
  achievementToast: document.getElementById('achievement-toast'),
  toastBadgeIcon: document.getElementById('toast-badge-icon'),
  toastBadgeTitle: document.getElementById('toast-badge-title'),
  toastBadgeDesc: document.getElementById('toast-badge-desc'),
  toastClose: document.getElementById('toast-close')
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  loadStateFromLocalStorage();
  setupEventListeners();
  renderApp();
  
  // Navigate to initial active tab (Dashboard by default)
  switchView('dashboard');
});

// Event Letters Setup
function setupEventListeners() {
  // Main navigation
  DOM.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const viewId = link.getAttribute('data-view');
      switchView(viewId);
      DOM.navMenu.classList.remove('show');
    });
  });

  // Mobile menu toggle
  if (DOM.mobileMenuToggle) {
    DOM.mobileMenuToggle.addEventListener('click', () => {
      DOM.navMenu.classList.toggle('show');
    });
  }

  // Calculator navigation buttons
  DOM.btnCalcPrev.addEventListener('click', prevCalculatorStep);
  DOM.btnCalcNext.addEventListener('click', nextCalculatorStep);

  // Projection year slider
  DOM.projectionSlider.addEventListener('input', updateProjections);

  // Toast close
  DOM.toastClose.addEventListener('click', hideAchievementToast);
}

// Router: Switch views (tabs)
window.switchView = switchView;
function switchView(viewId) {
  DOM.navLinks.forEach(btn => {
    if (btn.getAttribute('data-view') === viewId) {
      btn.closest('.nav-item').classList.add('active');
    } else {
      btn.closest('.nav-item').classList.remove('active');
    }
  });

  DOM.views.forEach(section => {
    if (section.id === `${viewId}-view`) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  if (viewId === 'dashboard') {
    renderDashboard();
    animateComparisonBars();
  } else if (viewId === 'calculator') {
    liveUpdateCalculatorPreview();
  } else if (viewId === 'actions') {
    renderActionPlan();
  } else if (viewId === 'quiz') {
    renderQuiz();
  } else if (viewId === 'achievements') {
    renderAchievements();
  }
}

// State Persistence
function saveStateToLocalStorage() {
  localStorage.setItem('eco_platform_state', JSON.stringify(STATE));
}

function loadStateFromLocalStorage() {
  const saved = localStorage.getItem('eco_platform_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(STATE, parsed);
      
      if (STATE.geminiApiKey) {
        setTimeout(() => {
          const keyInput = document.getElementById('input-api-key');
          if (keyInput) keyInput.value = STATE.geminiApiKey;
          updateKeyStatusUI(true);
        }, 100);
      }
    } catch (e) {
      console.error("Failed to parse local storage state", e);
    }
  }
}

// --- MICRO-INTERACTION: COUNTING NUMBERS ---
function animateNumber(element, start, end, duration, appendText = "", isFloat = false) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = progress * (end - start) + start;
    element.innerHTML = isFloat 
      ? `${currentVal.toFixed(1)}${appendText}`
      : `${Math.floor(currentVal).toLocaleString()}${appendText}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.innerHTML = isFloat 
        ? `${end.toFixed(1)}${appendText}`
        : `${end.toLocaleString()}${appendText}`;
    }
  };
  window.requestAnimationFrame(step);
}

// --- GLOBAL RENDER ---
function renderApp() {
  syncStateToInputs();
  checkBadgeUnlocks();
}

function syncStateToInputs() {
  const inputs = STATE.calculatorInputs;
  
  // Energy
  document.getElementById('in-electricity').value = inputs.energy.electricityKwh;
  document.getElementById('in-clean-energy').value = inputs.energy.cleanEnergyShare;
  document.getElementById('in-clean-energy-val').textContent = `${inputs.energy.cleanEnergyShare}%`;
  document.getElementById('in-gas').value = inputs.energy.gasKwh;
  document.getElementById('in-heating-oil').value = inputs.energy.heatingOilLiters;
  document.getElementById('in-household').value = inputs.energy.householdMembers;

  // Transport
  document.getElementById('in-car-km').value = inputs.transport.carKmPerWeek;
  document.getElementById('in-car-fuel').value = inputs.transport.carFuelType;
  document.getElementById('in-bus-km').value = inputs.transport.busKmPerWeek;
  document.getElementById('in-train-km').value = inputs.transport.trainKmPerWeek;
  document.getElementById('in-short-flights').value = inputs.transport.shortHaulFlights;
  document.getElementById('in-long-flights').value = inputs.transport.longHaulFlights;

  // Food
  document.querySelectorAll('#food-diet-options .option-card').forEach(card => {
    if (card.getAttribute('data-value') === inputs.food.dietType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  
  document.querySelectorAll('#food-waste-options .option-card').forEach(card => {
    if (card.getAttribute('data-value') === inputs.food.foodWasteLevel) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Waste
  document.getElementById('in-waste-bags').value = inputs.waste.wasteBagsPerWeek;
  document.getElementById('in-recycling').value = inputs.waste.recyclingLevel;
}

// --- DASHBOARD CONTROLLER ---
function getActiveReductionSavings() {
  let savings = 0;
  STATE.activeActions.forEach(actionId => {
    const action = ACTIONS_DATABASE.find(a => a.id === actionId);
    if (action) {
      savings += action.co2Savings;
    }
  });
  return savings;
}

function renderDashboard() {
  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );

  // Update animated footprint counter
  const totalTonnes = footprint.total / 1000;
  
  if (STATE.calculatedOnce) {
    animateNumber(DOM.footprintVal, 0, totalTonnes, 800, ' <span class="footprint-unit">tCO₂e/yr</span>', true);
    
    // Compare baseline
    const diffPercent = Math.round((Math.abs(footprint.total - COUNTRY_COMPARISONS.globalAverage) / COUNTRY_COMPARISONS.globalAverage) * 100);
    if (footprint.total > COUNTRY_COMPARISONS.globalAverage) {
      DOM.footprintCompText.textContent = `${diffPercent}% ABOVE Global Average`;
      DOM.footprintCompIcon.textContent = '▲';
      DOM.footprintCompIcon.closest('.footprint-comparison').className = 'footprint-comparison above';
    } else {
      DOM.footprintCompText.textContent = `${diffPercent}% BELOW Global Average`;
      DOM.footprintCompIcon.textContent = '▼';
      DOM.footprintCompIcon.closest('.footprint-comparison').className = 'footprint-comparison below';
    }
  } else {
    DOM.footprintVal.innerHTML = `0.0 <span class="footprint-unit">tCO₂e/yr</span>`;
    DOM.footprintCompText.textContent = 'Enter values in the calculator to start.';
    DOM.footprintCompIcon.textContent = '●';
    DOM.footprintCompIcon.closest('.footprint-comparison').className = 'footprint-comparison';
  }

  // Sub-stats
  DOM.dbCleanEnergyVal.textContent = `${STATE.calculatorInputs.energy.cleanEnergyShare}%`;
  DOM.dbCarKmVal.textContent = `${STATE.calculatorInputs.transport.carKmPerWeek} km/wk`;

  // Savings and Goal stats animations
  const activeSavings = getActiveReductionSavings();
  animateNumber(DOM.dbSavingsVal, 0, activeSavings, 500, ' kg');
  DOM.dbGoalsVal.textContent = STATE.activeActions.length;
  DOM.dbBadgesVal.textContent = Object.keys(STATE.unlockedBadges).length;

  // Chart Rendering
  renderDashboardCharts(footprint);
  
  // Tip Rendering
  renderDynamicTip(footprint.breakdown);
}

function renderDashboardCharts(footprint) {
  const ctx = document.getElementById('carbon-donut-chart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const hasData = STATE.calculatedOnce && footprint.total > 0;
  const dataValues = hasData 
    ? [footprint.breakdown.energy, footprint.breakdown.transport, footprint.breakdown.food, footprint.breakdown.waste]
    : [1, 1, 1, 1]; // neutral placeholders if not calculated

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Home Energy', 'Transportation', 'Food & Diet', 'Waste & recycling'],
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#f59e0b', // Amber
          '#06b6d4', // Teal/Cyan
          '#10b981', // Emerald
          '#c084fc'  // Purple
        ],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = ((val / footprint.total) * 100).toFixed(0);
              return `${context.label}: ${val.toLocaleString()} kg CO2e (${pct}%)`;
            }
          }
        }
      },
      cutout: '72%'
    }
  });

  updateProjections();
}

function animateComparisonBars() {
  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );

  const baselineValue = STATE.calculatedOnce ? footprint.total : 0;
  const maxVal = Math.max(
    baselineValue,
    COUNTRY_COMPARISONS.usaAverage,
    COUNTRY_COMPARISONS.globalAverage
  );

  const setBarWidth = (element, val, valueLabelEl) => {
    const percent = (val / maxVal) * 100;
    setTimeout(() => {
      element.style.width = `${percent}%`;
    }, 100);
    if (valueLabelEl) {
      valueLabelEl.textContent = `${(val / 1000).toFixed(1)} t`;
    }
  };

  setBarWidth(DOM.compBarUser, baselineValue, DOM.compBarUserVal);
  setBarWidth(DOM.compBarTarget, COUNTRY_COMPARISONS.climateTarget2030);
  setBarWidth(DOM.compBarGlobal, COUNTRY_COMPARISONS.globalAverage);
  setBarWidth(DOM.compBarUsa, COUNTRY_COMPARISONS.usaAverage);
}

function updateProjections() {
  const years = parseInt(DOM.projectionSlider.value);
  DOM.projectionYearLabel.textContent = `${years} Year${years > 1 ? 's' : ''}`;

  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );
  
  const annualFootprint = STATE.calculatedOnce ? footprint.total : 5500; // default average if not run
  const annualSavings = getActiveReductionSavings();

  const cumulativeBau = (annualFootprint * years) / 1000;
  const cumulativeSavings = (annualSavings * years) / 1000;
  const cumulativePlan = Math.max(0, cumulativeBau - cumulativeSavings);

  DOM.projValBau.textContent = `${cumulativeBau.toFixed(1)} t`;
  DOM.projValPlan.textContent = `${cumulativePlan.toFixed(1)} t`;
  DOM.projValSaved.textContent = `${cumulativeSavings.toFixed(1)} t`;
}

function renderDynamicTip(breakdown) {
  if (!STATE.calculatedOnce) {
    DOM.dashboardTipTitle.textContent = "Calculate Your Footprint";
    DOM.dashboardTipDesc.textContent = "Please complete the Carbon Footprint Calculator to receive personalized insights and energy saving advice.";
    DOM.dashboardTipIcon.textContent = "💡";
    return;
  }

  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const highestCategory = sorted[0][0];

  const tips = {
    energy: {
      title: "Focus on Home Energy",
      desc: "Your utility emissions are currently high. Try upgrading to LED lightbulbs, installing solar panels, or signing up with a utility provider that guarantees a portion of renewable energy sources.",
      icon: "⚡"
    },
    transport: {
      title: "Optimize Your Commutes",
      desc: "Transportation represents your largest carbon slice. Try replacing shorter car runs with a walk or bicycle trip, carpooling with colleagues, or swapping one annual flight for train travel.",
      icon: "🚗"
    },
    food: {
      title: "Refine Your Diet Choices",
      desc: "Food production emissions represent a large impact area. Adopting 'Meatless Mondays' or swapping beef dishes for chicken or plant-based proteins (beans, tofu) offers massive personal carbon cuts.",
      icon: "🥗"
    },
    waste: {
      title: "Improve Household Recycling",
      desc: "Trash footprint is higher than average. Setting up rigorous recycling for papers, tins, and plastics, plus starting home composting for kitchen organic waste, can cut waste footprint in half.",
      icon: "♻️"
    }
  };

  const selectedTip = tips[highestCategory] || tips.energy;
  DOM.dashboardTipTitle.textContent = selectedTip.title;
  DOM.dashboardTipDesc.textContent = selectedTip.desc;
  DOM.dashboardTipIcon.textContent = selectedTip.icon;
}

// --- CALCULATOR CONTROLLER ---
export function prevCalculatorStep() {
  if (activeCalcStep > 0) {
    activeCalcStep--;
    showCalculatorStep(activeCalcStep);
  }
}

export function nextCalculatorStep() {
  saveCalculatorInputsByStep(activeCalcStep);

  if (activeCalcStep < 3) {
    activeCalcStep++;
    showCalculatorStep(activeCalcStep);
  } else {
    // Generate Report
    STATE.calculatedOnce = true;
    checkBadgeUnlocks();
    saveStateToLocalStorage();
    
    switchView('dashboard');
    activeCalcStep = 0;
    showCalculatorStep(activeCalcStep);
  }
}

function showCalculatorStep(stepIndex) {
  DOM.calcStepPanels.forEach((panel, idx) => {
    if (idx === stepIndex) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  DOM.calcStepDots.forEach((dot, idx) => {
    dot.className = 'step-dot';
    if (idx === stepIndex) {
      dot.classList.add('active');
    } else if (idx < stepIndex) {
      dot.classList.add('completed');
    }
  });

  const stepTitles = ["Home Utility Energy", "Transportation & Commute", "Food & Eating Habits", "Waste & Recycling"];
  DOM.calcStepTitle.textContent = `Step ${stepIndex + 1}: ${stepTitles[stepIndex]}`;

  DOM.btnCalcPrev.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
  DOM.btnCalcNext.textContent = stepIndex === 3 ? 'Generate Report' : 'Next Step';
}

function saveCalculatorInputsByStep(stepIndex) {
  const inputs = STATE.calculatorInputs;
  
  if (stepIndex === 0) {
    inputs.energy.electricityKwh = Number(document.getElementById('in-electricity').value) || 0;
    inputs.energy.cleanEnergyShare = Number(document.getElementById('in-clean-energy').value) || 0;
    inputs.energy.gasKwh = Number(document.getElementById('in-gas').value) || 0;
    inputs.energy.heatingOilLiters = Number(document.getElementById('in-heating-oil').value) || 0;
    inputs.energy.householdMembers = Number(document.getElementById('in-household').value) || 1;
  } 
  else if (stepIndex === 1) {
    inputs.transport.carKmPerWeek = Number(document.getElementById('in-car-km').value) || 0;
    inputs.transport.carFuelType = document.getElementById('in-car-fuel').value;
    inputs.transport.busKmPerWeek = Number(document.getElementById('in-bus-km').value) || 0;
    inputs.transport.trainKmPerWeek = Number(document.getElementById('in-train-km').value) || 0;
    inputs.transport.shortHaulFlights = Number(document.getElementById('in-short-flights').value) || 0;
    inputs.transport.longHaulFlights = Number(document.getElementById('in-long-flights').value) || 0;
  } 
  else if (stepIndex === 2) {
    const selectedDietCard = document.querySelector('#food-diet-options .option-card.selected');
    if (selectedDietCard) {
      inputs.food.dietType = selectedDietCard.getAttribute('data-value');
    }
    const selectedWasteCard = document.querySelector('#food-waste-options .option-card.selected');
    if (selectedWasteCard) {
      inputs.food.foodWasteLevel = selectedWasteCard.getAttribute('data-value');
    }
  } 
  else if (stepIndex === 3) {
    inputs.waste.wasteBagsPerWeek = Number(document.getElementById('in-waste-bags').value) || 0;
    inputs.waste.recyclingLevel = document.getElementById('in-recycling').value;
  }
}

// --- INTERACTIVE: LIVE CALCULATOR PREVIEW ---
window.liveUpdateCalculatorPreview = function() {
  // Save current fields (even if not finalized)
  const currentInputs = {
    energy: {
      electricityKwh: Number(document.getElementById('in-electricity').value) || 0,
      cleanEnergyShare: Number(document.getElementById('in-clean-energy').value) || 0,
      gasKwh: Number(document.getElementById('in-gas').value) || 0,
      gasTherms: 0,
      heatingOilLiters: Number(document.getElementById('in-heating-oil').value) || 0,
      householdMembers: Number(document.getElementById('in-household').value) || 1
    },
    transport: {
      carKmPerWeek: Number(document.getElementById('in-car-km').value) || 0,
      carFuelType: document.getElementById('in-car-fuel').value,
      busKmPerWeek: Number(document.getElementById('in-bus-km').value) || 0,
      trainKmPerWeek: Number(document.getElementById('in-train-km').value) || 0,
      shortHaulFlights: Number(document.getElementById('in-short-flights').value) || 0,
      longHaulFlights: Number(document.getElementById('in-long-flights').value) || 0
    },
    food: {
      dietType: 'averageMeat',
      foodWasteLevel: 'medium'
    },
    waste: {
      wasteBagsPerWeek: Number(document.getElementById('in-waste-bags').value) || 0,
      recyclingLevel: document.getElementById('in-recycling').value
    }
  };

  // Get food selected options
  const selectedDietCard = document.querySelector('#food-diet-options .option-card.selected');
  if (selectedDietCard) currentInputs.food.dietType = selectedDietCard.getAttribute('data-value');
  const selectedWasteCard = document.querySelector('#food-waste-options .option-card.selected');
  if (selectedWasteCard) currentInputs.food.foodWasteLevel = selectedWasteCard.getAttribute('data-value');

  // Compute live breakdown
  const footprint = calculateTotalFootprint(
    currentInputs.energy,
    currentInputs.transport,
    currentInputs.food,
    currentInputs.waste
  );

  // Update preview panel elements
  const totalTonnes = (footprint.total / 1000).toFixed(1);
  DOM.calcLiveTotal.textContent = totalTonnes;
  DOM.calcLiveEnergy.textContent = `${footprint.breakdown.energy.toLocaleString()} kg`;
  DOM.calcLiveTransport.textContent = `${footprint.breakdown.transport.toLocaleString()} kg`;
  DOM.calcLiveFood.textContent = `${footprint.breakdown.food.toLocaleString()} kg`;
  DOM.calcLiveWaste.textContent = `${footprint.breakdown.waste.toLocaleString()} kg`;

  // Compare to target threshold
  if (footprint.total <= COUNTRY_COMPARISONS.climateTarget2030) {
    DOM.liveCompAlert.className = 'comp-target-alert';
    DOM.liveCompAlertText.textContent = "Sustainable! Your footprint is under target.";
  } else {
    DOM.liveCompAlert.className = 'comp-target-alert warning';
    DOM.liveCompAlertText.textContent = "Footprint exceeds sustainable targets.";
  }
};

window.updateCleanEnergyDisplay = function(val) {
  document.getElementById('in-clean-energy-val').textContent = `${val}%`;
};

window.selectFoodOption = function(element, group) {
  const container = document.getElementById(group);
  container.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
  element.classList.add('selected');
};

// --- ACTION PLAN CONTROLLER ---
function renderActionPlan() {
  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );

  const recommendedActions = getRecommendedActions(footprint.breakdown);
  renderCategoryFilterCounts();

  DOM.actionsList.innerHTML = '';
  
  const filtered = currentActionFilter === 'all' 
    ? recommendedActions 
    : recommendedActions.filter(action => action.category === currentActionFilter);

  if (filtered.length === 0) {
    DOM.actionsList.innerHTML = `<div class="glass-panel" style="padding:2.5rem; text-align:center; color:var(--text-muted);">No recommendations found for this category.</div>`;
    return;
  }

  filtered.forEach(action => {
    const isAdded = STATE.activeActions.includes(action.id);
    const card = document.createElement('div');
    card.className = `glass-panel action-card-item ${action.category}`;
    
    const categoryIcons = {
      energy: '⚡',
      transport: '🚗',
      food: '🥗',
      waste: '♻️'
    };
    
    card.innerHTML = `
      <div class="action-main-info">
        <div class="action-cat-icon">
          ${categoryIcons[action.category] || '🌱'}
        </div>
        <div class="action-meta">
          <h4>${action.title}</h4>
          <p>${action.description}</p>
          <div class="action-tags">
            <span class="tag tag-savings">-${action.co2Savings} kg CO₂e/yr</span>
            <span class="tag tag-diff-${action.difficulty.toLowerCase()}">Diff: ${action.difficulty}</span>
            <span class="tag">Cost: ${action.cost}</span>
          </div>
        </div>
      </div>
      <button class="btn-add-action ${isAdded ? 'active' : ''}" onclick="toggleActionGoal('${action.id}')">
        ${isAdded ? 'Remove Goal' : 'Commit to Goal'}
      </button>
    `;
    DOM.actionsList.appendChild(card);
  });

  const currentSavings = getActiveReductionSavings();
  animateNumber(DOM.savingsMeterVal, 0, currentSavings, 500);
}

window.toggleActionGoal = function(actionId) {
  const index = STATE.activeActions.indexOf(actionId);
  if (index > -1) {
    STATE.activeActions.splice(index, 1);
  } else {
    STATE.activeActions.push(actionId);
  }

  checkBadgeUnlocks();
  saveStateToLocalStorage();
  renderActionPlan();
};

window.setActionFilter = function(category) {
  currentActionFilter = category;
  
  const buttons = DOM.actionFilters.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-filter') === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderActionPlan();
};

function renderCategoryFilterCounts() {
  const counts = { all: ACTIONS_DATABASE.length, energy: 0, transport: 0, food: 0, waste: 0 };
  ACTIONS_DATABASE.forEach(action => {
    counts[action.category]++;
  });

  Object.entries(counts).forEach(([cat, val]) => {
    const badge = document.querySelector(`.filter-btn[data-filter="${cat}"] .badge`);
    if (badge) {
      badge.textContent = val;
    }
  });
}

// --- QUIZ CONTROLLER ---
function renderQuiz() {
  DOM.quizPanel.innerHTML = '';

  if (quizSession.completed) {
    renderQuizResults();
    return;
  }

  const question = quizSession.getCurrentQuestion();
  if (!question) return;

  const totalQuestions = quizSession.userAnswers.length + 1;
  const totalCount = 10;
  const progressPercent = (quizSession.currentQuestionIndex / totalCount) * 100;

  DOM.quizPanel.innerHTML = `
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width: ${progressPercent}%"></div>
    </div>
    <div class="quiz-meta-info">
      <span>Question ${totalQuestions} of ${totalCount}</span>
      <span>Score: ${quizSession.score} / ${quizSession.currentQuestionIndex}</span>
    </div>
    <div class="quiz-question-box">
      <h3>${question.question}</h3>
      <div class="quiz-options-list" id="quiz-options">
        ${question.options.map((opt, idx) => `
          <button class="quiz-opt-btn" onclick="submitQuizAnswer(${idx})">${opt}</button>
        `).join('')}
      </div>
      <div class="quiz-explanation-box" id="quiz-explanation" style="display: none;">
        <h4 id="quiz-explanation-title"></h4>
        <p id="quiz-explanation-text"></p>
      </div>
      <div class="quiz-next-container" id="quiz-next-container" style="display: none;">
        <button class="btn btn-primary" onclick="nextQuizQuestion()">
          ${quizSession.currentQuestionIndex === totalCount - 1 ? 'Finish Quiz' : 'Next Question'} →
        </button>
      </div>
    </div>
  `;
}

window.submitQuizAnswer = function(selectedIdx) {
  const question = quizSession.getCurrentQuestion();
  if (!question) return;

  const btns = document.querySelectorAll('#quiz-options .quiz-opt-btn');
  btns.forEach(btn => btn.setAttribute('disabled', 'true'));

  const isCorrect = (selectedIdx === question.correctAnswer);
  
  btns[question.correctAnswer].classList.add('correct');
  if (!isCorrect) {
    btns[selectedIdx].classList.add('incorrect');
  }

  const expBox = document.getElementById('quiz-explanation');
  const expTitle = document.getElementById('quiz-explanation-title');
  const expText = document.getElementById('quiz-explanation-text');
  
  if (isCorrect) {
    expTitle.textContent = "Correct! 🎉";
    expTitle.className = "txt-correct";
  } else {
    expTitle.textContent = "Incorrect";
    expTitle.className = "txt-incorrect";
  }

  expText.textContent = question.explanation;
  expBox.style.display = 'block';

  quizSession.submitAnswer(selectedIdx);
  document.getElementById('quiz-next-container').style.display = 'flex';
};

window.nextQuizQuestion = function() {
  if (quizSession.completed) {
    if (quizSession.score > STATE.quizHighscore) {
      STATE.quizHighscore = quizSession.score;
    }
    checkBadgeUnlocks();
    saveStateToLocalStorage();
  }
  renderQuiz();
};

function renderQuizResults() {
  const pct = quizSession.getPercentScore();
  let feedback = "Keep learning to become an eco-expert!";
  
  if (pct === 100) {
    feedback = "Outstanding! You are a certified carbon footprint wizard! 🎓";
  } else if (pct >= 70) {
    feedback = "Great job! You have solid environmental literacy. 🌿";
  }

  DOM.quizPanel.innerHTML = `
    <div class="quiz-results-screen">
      <div class="quiz-trophy-icon">🏆</div>
      <h3>Quiz Completed!</h3>
      <div class="quiz-results-score-details">
        You scored <strong>${quizSession.score} / 10</strong> (${pct}%)
      </div>
      <p style="margin-bottom: 2rem; color:var(--text-muted);">${feedback}</p>
      <button class="btn btn-primary" onclick="restartQuiz()">Try Again</button>
    </div>
  `;
}

window.restartQuiz = function() {
  quizSession.reset();
  renderQuiz();
};

// --- ACHIEVEMENTS CONTROLLER ---
function renderAchievements() {
  DOM.achievementsList.innerHTML = '';
  
  BADGES.forEach(badge => {
    const isUnlocked = !!STATE.unlockedBadges[badge.id];
    const unlockDate = STATE.unlockedBadges[badge.id] || '';

    const card = document.createElement('div');
    card.className = `glass-panel badge-card ${isUnlocked ? 'unlocked' : ''}`;
    
    card.innerHTML = `
      <div class="badge-lock-overlay">🔒</div>
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-title">${badge.title}</div>
      <div class="badge-desc">${badge.desc}</div>
      <div class="badge-status">
        ${isUnlocked ? `Unlocked ${unlockDate}` : 'Locked'}
      </div>
    `;
    DOM.achievementsList.appendChild(card);
  });
}

function checkBadgeUnlocks() {
  let newlyUnlocked = [];

  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );

  if (STATE.calculatedOnce && !STATE.unlockedBadges['eco_pioneer']) {
    unlockBadge('eco_pioneer');
    newlyUnlocked.push('eco_pioneer');
  }

  if (STATE.calculatedOnce && footprint.total <= COUNTRY_COMPARISONS.climateTarget2030 && !STATE.unlockedBadges['low_carbon_hero']) {
    unlockBadge('low_carbon_hero');
    newlyUnlocked.push('low_carbon_hero');
  }

  const transportState = STATE.calculatorInputs.transport;
  const isCommuteChamp = transportState.carKmPerWeek === 0 || transportState.carFuelType === 'electric';
  if (STATE.calculatedOnce && isCommuteChamp && !STATE.unlockedBadges['commute_champ']) {
    unlockBadge('commute_champ');
    newlyUnlocked.push('commute_champ');
  }

  const foodState = STATE.calculatorInputs.food;
  const isGreenFoodie = ['vegetarian', 'vegan'].includes(foodState.dietType);
  if (STATE.calculatedOnce && isGreenFoodie && !STATE.unlockedBadges['green_foodie']) {
    unlockBadge('green_foodie');
    newlyUnlocked.push('green_foodie');
  }

  const wasteState = STATE.calculatorInputs.waste;
  if (STATE.calculatedOnce && wasteState.recyclingLevel === 'full' && !STATE.unlockedBadges['recycling_ninja']) {
    unlockBadge('recycling_ninja');
    newlyUnlocked.push('recycling_ninja');
  }

  if (STATE.activeActions.length >= 3 && !STATE.unlockedBadges['goal_setter']) {
    unlockBadge('goal_setter');
    newlyUnlocked.push('goal_setter');
  }

  const activeSavings = getActiveReductionSavings();
  if (activeSavings >= 1000 && !STATE.unlockedBadges['carbon_cutter']) {
    unlockBadge('carbon_cutter');
    newlyUnlocked.push('carbon_cutter');
  }

  if (STATE.quizHighscore === 10 && !STATE.unlockedBadges['quiz_master']) {
    unlockBadge('quiz_master');
    newlyUnlocked.push('quiz_master');
  }

  if (newlyUnlocked.length > 0) {
    const firstBadge = newlyUnlocked[0];
    const badgeDef = BADGES.find(b => b.id === firstBadge);
    if (badgeDef) {
      showAchievementToast(badgeDef);
    }
  }
}

function unlockBadge(badgeId) {
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  STATE.unlockedBadges[badgeId] = dateStr;
}

function showAchievementToast(badge) {
  DOM.toastBadgeIcon.textContent = badge.icon;
  DOM.toastBadgeTitle.textContent = badge.title;
  DOM.toastBadgeDesc.textContent = badge.desc;
  
  DOM.achievementToast.classList.add('show');
  setTimeout(hideAchievementToast, 6000);
}

function hideAchievementToast() {
  DOM.achievementToast.classList.remove('show');
}

// --- AI ECO-ADVISOR CONTROLLER ---
function updateKeyStatusUI(isSaved) {
  const statusEl = document.getElementById('api-key-status');
  const statusTextEl = document.getElementById('api-key-status-text');
  if (!statusEl || !statusTextEl) return;
  
  if (isSaved) {
    statusEl.className = 'key-status-text saved';
    statusTextEl.textContent = 'Active (Gemini 1.5 Flash Connected)';
  } else {
    statusEl.className = 'key-status-text missing';
    statusTextEl.textContent = 'Demo Mode (Local templates active)';
  }
}

window.saveGeminiKey = function() {
  const keyInput = document.getElementById('input-api-key');
  if (!keyInput) return;
  const key = keyInput.value.trim();
  
  STATE.geminiApiKey = key;
  saveStateToLocalStorage();
  updateKeyStatusUI(!!key);
  
  const chatLog = document.getElementById('chat-messages-log');
  const confirmMsg = document.createElement('div');
  confirmMsg.className = 'chat-message ai';
  confirmMsg.innerHTML = key 
    ? `<p><strong>Aura Eco-Advisor:</strong> Gemini API Key saved successfully. Real-time conversations are now active! How can I consult you today?</p>`
    : `<p><strong>Aura Eco-Advisor:</strong> API Key removed. Reverted to local demo templates.</p>`;
  chatLog.appendChild(confirmMsg);
  chatLog.scrollTop = chatLog.scrollHeight;
};

window.sendUserChatMessage = async function() {
  const inputEl = document.getElementById('input-chat-message');
  if (!inputEl) return;
  const userText = inputEl.value.trim();
  if (!userText) return;

  // Clear input
  inputEl.value = '';

  const chatLog = document.getElementById('chat-messages-log');
  if (!chatLog) return;
  
  // 1. Render User Message
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-message user';
  userBubble.textContent = userText;
  chatLog.appendChild(userBubble);
  chatLog.scrollTop = chatLog.scrollHeight;

  // 2. Render Typing Indicator
  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-message ai';
  typingBubble.id = 'ai-typing-indicator';
  typingBubble.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatLog.appendChild(typingBubble);
  chatLog.scrollTop = chatLog.scrollHeight;

  // Formulate history format for api
  const formattedHistory = STATE.chatHistory.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    text: msg.text
  }));

  const footprint = calculateTotalFootprint(
    STATE.calculatorInputs.energy,
    STATE.calculatorInputs.transport,
    STATE.calculatorInputs.food,
    STATE.calculatorInputs.waste
  );

  let responseText = '';
  let isError = false;

  try {
    if (STATE.geminiApiKey) {
      responseText = await getGeminiResponse(userText, STATE.geminiApiKey, footprint, formattedHistory);
    } else {
      responseText = getLocalFallbackResponse(userText, footprint);
    }
  } catch (err) {
    responseText = `Error: ${err.message || 'Failed to connect to Gemini API. Please verify your internet connection or API Key correctness.'}`;
    isError = true;
  }

  // Remove typing indicator
  const typingEl = document.getElementById('ai-typing-indicator');
  if (typingEl) typingEl.remove();

  // 3. Render AI Response
  const aiBubble = document.createElement('div');
  aiBubble.className = isError ? 'chat-message system-error' : 'chat-message ai';
  
  if (isError) {
    aiBubble.textContent = responseText;
  } else {
    aiBubble.innerHTML = `<strong>Aura Eco-Advisor:</strong> ${parseMarkdown(responseText)}`;
  }
  
  chatLog.appendChild(aiBubble);
  chatLog.scrollTop = chatLog.scrollHeight;

  // Record in state history
  if (!isError) {
    STATE.chatHistory.push({ sender: 'user', text: userText });
    STATE.chatHistory.push({ sender: 'ai', text: responseText });
    if (STATE.chatHistory.length > 20) {
      STATE.chatHistory.shift();
      STATE.chatHistory.shift();
    }
    saveStateToLocalStorage();
  }
};

window.sendQuickPrompt = function(promptText) {
  const inputEl = document.getElementById('input-chat-message');
  if (inputEl) {
    inputEl.value = promptText;
    window.sendUserChatMessage();
  }
};

function parseMarkdown(text) {
  // Very simple client-side markdown parser
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>');
  
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  const paragraphs = html.split(/\n\n+/);
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<li')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}
