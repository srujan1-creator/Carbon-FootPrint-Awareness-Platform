/**
 * Gemini AI Eco-Advisor Client
 * Routes conversational queries through the local Python backend API proxy.
 */

/**
 * Sends a conversation thread with footprint context to the Python Backend proxy.
 * @param {string} userMessage - The latest message from the user.
 * @param {string} apiKey - The user's optional Google Gemini API Key (falls back to server key if configured).
 * @param {Object} footprintData - The user's current carbon breakdown (from calculator.js).
 * @param {Array} history - Previous messages in format [{role: 'user'|'model', text: ''}]
 * @returns {Promise<string>} - The AI assistant response in markdown format.
 */
export async function getGeminiResponse(userMessage, apiKey, footprintData, history = []) {
  const url = '/api/advisor';
  
  const payload = {
    message: userMessage,
    apiKey: apiKey, // optional frontend fallback key
    footprint: footprintData,
    history: history
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error || `HTTP Error ${response.status}`;
      throw new Error(errMsg);
    }

    if (!data.response) {
      throw new Error("Received an empty response from the backend advisor.");
    }

    return data.response;
  } catch (error) {
    console.error("Failed to fetch response from AI backend proxy:", error);
    throw error;
  }
}

/**
 * Fallback static templates in case the user does not have an API Key configured either on server or client.
 * Offers context-relevant carbon savings answers locally.
 */
export function getLocalFallbackResponse(userMessage, footprintData) {
  const query = userMessage.toLowerCase();
  
  if (query.includes('analyze') || query.includes('report') || query.includes('footprint')) {
    const total = (footprintData.total / 1000).toFixed(1);
    const sorted = Object.entries(footprintData.breakdown).sort((a, b) => b[1] - a[1]);
    const highest = sorted[0][0];
    
    return `### 📊 Local Footprint Analysis (Local Demo)

Your total calculated carbon footprint is **${total} tonnes of CO2e** per year.

* **Highest Sector**: **${highest.toUpperCase()}** (${footprintData.breakdown[highest].toLocaleString()} kg CO2e)
* **Status**: ${footprintData.total <= 2000 ? "Excellent! You are meeting the IPCC 2030 climate threshold." : "Your footprint exceeds the sustainable 2.0-tonne budget. We recommend focusing on reduction goals in your **" + highest + "** category."}

*For a full conversational chat, please paste a valid Google Gemini API Key in the setup panel or configure it on the Python server.*`;
  }

  if (query.includes('energy') || query.includes('electricity') || query.includes('home')) {
    return `### ⚡ Energy Saving Advice (Local Demo)
Your home energy emissions represent **${footprintData.breakdown.energy.toLocaleString()} kg CO2e/yr**.

**Top Recommendations**:
1. **LED Lighting**: Swapping 10 bulbs to LEDs saves ~150 kg CO2e/year.
2. **Thermostat settings**: Lowering winter heating by 2°C saves ~340 kg CO2e/year.
3. **Green Grid**: Switch to a grid utility offering clean/solar power shares.`;
  }

  if (query.includes('transport') || query.includes('car') || query.includes('flight')) {
    return `### 🚗 Transport Emission Reductions (Local Demo)
Your transport emissions represent **${footprintData.breakdown.transport.toLocaleString()} kg CO2e/yr**.

**Top Recommendations**:
1. **Active Travel**: Walk or cycle short trips under 5km (saves up to 450 kg CO2e/year).
2. **Commute Pooling**: Carpool twice weekly or switch to trains (saves up to 1,200 kg CO2e/year).
3. **Flight Swaps**: Switch long-haul flights with regional high-speed rail trips where possible.`;
  }

  return `### 👋 Welcome to Aura Eco-Advisor (Local Demo Mode)
I am your interactive AI assistant. 

To enable **live, intelligent conversation powered by Gemini 1.5 Flash**, please insert a valid **Google Gemini API Key** in the settings panel.

**Quick Demo Queries you can ask locally**:
* *"Analyze my footprint"*
* *"How can I save energy at home?"*
* *"Tips to reduce transport emissions"*`;
}
