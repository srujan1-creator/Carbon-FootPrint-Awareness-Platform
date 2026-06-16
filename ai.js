/**
 * Gemini AI Eco-Advisor Client
 * Communicates with the Google Gemini API directly from the browser.
 */

/**
 * Sends a conversation thread with footprint context to Gemini 1.5 Flash.
 * @param {string} userMessage - The latest message from the user.
 * @param {string} apiKey - The user's Google Gemini API Key.
 * @param {Object} footprintData - The user's current carbon breakdown (from calculator.js).
 * @param {Array} history - Previous messages in format [{role: 'user'|'model', text: ''}]
 * @returns {Promise<string>} - The AI assistant response in markdown format.
 */
export async function getGeminiResponse(userMessage, apiKey, footprintData, history = []) {
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your Gemini API Key first.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Format the system prompt guiding the AI's behavior
  const systemPrompt = `You are Aura Eco-Advisor, a friendly, highly intelligent, and supportive AI environmental consultant.
The user is utilizing the Aura Carbon Awareness Platform to track and reduce their carbon footprint.

Here is the user's active carbon footprint profile:
- Total Footprint: ${(footprintData.total / 1000).toFixed(1)} tonnes CO2e/year.
- Home Utility Energy: ${footprintData.breakdown.energy.toLocaleString()} kg CO2e/year.
- Transportation/Commute: ${footprintData.breakdown.transport.toLocaleString()} kg CO2e/year.
- Food & Diet: ${footprintData.breakdown.food.toLocaleString()} kg CO2e/year.
- Household Waste & Recycling: ${footprintData.breakdown.waste.toLocaleString()} kg CO2e/year.

Guidelines for your response:
1. Be encouraging and focus on positive, actionable steps.
2. Refer to their specific footprint metrics when they ask questions (e.g., if their transport emissions are high, suggest custom transport options).
3. Provide answers formatted in clean markdown (bullet points, bold text).
4. Keep responses concise and practical (around 2-3 short paragraphs or clean lists).
5. Do not make up facts. Use scientific guidelines aligned with IPCC, EPA, and DEFRA.
`;

  // Construct Gemini request contents structure
  const contents = [];

  // Add history
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // Add latest user message pre-pended with the system context instructions
  // Gemini 1.5 Flash supports system instructions, but prefixing it in the first message
  // is highly reliable across all API models.
  const contextMessage = `[Eco-Advisor Context - System Instructions: ${systemPrompt}]\n\nUser Message: ${userMessage}`;
  contents.push({
    role: 'user',
    parts: [{ text: contextMessage }]
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Received an empty response from Gemini API.");
    }

    return textResponse;
  } catch (error) {
    console.error("Gemini API request failed:", error);
    throw error;
  }
}

/**
 * Fallback static templates in case the user does not have an API Key.
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

*For a full conversational chat, please paste a valid Google Gemini API Key in the setup panel.*`;
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
