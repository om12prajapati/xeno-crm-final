const express = require('express');
const cors = require('cors');
const axios = require('axios'); 
const customers = require('./dataset.json');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Secure Environment Variable Handoff (GitHub safe, Render dashboard injected)
const apiKey = process.env.GEMINI_API_KEY;

let campaignStats = {
  totalSent: 0,
  delivered: 0,
  opened: 0,
  failed: 0
};

// Endpoint 1: Fetch live dashboard statistics counters
app.get('/api/stats', (req, res) => {
  res.json(campaignStats);
});

// Endpoint 2: Fetch the full customer profile database
app.get('/api/customers', (req, res) => {
  res.json(customers);
});

// Endpoint 3: Connects directly to Google's raw REST gateway, bypassing buggy client SDK wrappers
app.post('/api/campaigns/send', async (req, res) => {
  const { prompt, channel } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing campaign segmentation prompt." });
  }

  // Safety fallback if the environment key didn't load properly on the hosting network
  if (!apiKey) {
    console.error("[CRITICAL CONFIG ERROR] GEMINI_API_KEY is missing from Render dashboard environment variables!");
    return res.status(500).json({ error: "Backend server configuration missing authentication parameters." });
  }

  try {
    console.log(`[HTTP REST API] Handshaking directly with Google for prompt: "${prompt}"`);

    const systemInstruction = `
      You are an expert database engine assistant. 
      Your single task is to translate natural language user segment rules into a raw JavaScript filter condition.
      The shopper object variable name is 'c'.
      Available properties on 'c':
      - c.lastOrderDaysAgo (number)
      - c.orders (number)
      - c.totalSpent (number)
      - c.preferredCategory (string)

      CRITICAL RULES:
      - Output ONLY the clean condition string.
      - Never include backticks (\`\`\`), 'javascript', wrapping quotes, or punctuation marks.
      - Example Input: "Find customers who haven't ordered in 90 days"
      - Example Output: c.lastOrderDaysAgo > 90
    `;

    // Pure public web API URL mapping bypassing OAuth and enterprise project checks
    const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Dispatch raw standard HTTP payload packet combining system context safely
    const googleResponse = await axios.post(googleEndpoint, {
      contents: [
        { 
          parts: [
            { text: `${systemInstruction}\n\nUser Request to translate: "${prompt}"` }
          ] 
        }
      ],r
      generationConfig: { 
        temperature: 0.1 
      }
    });

    // Extract raw text response value out of the Google response JSON schema
    const rawAiText = googleResponse.data.candidates[0].content.parts[0].text;
    const filterCondition = rawAiText.trim().replace(/```javascript|```/g, '').trim();
    
    console.log(`[HTTP REST LOG] Clean Query Generated: ${filterCondition}`);

    // Dynamic compilation loop across local shopper list 
    let targetCustomers = [];
    try {
      const evaluationFunction = new Function('c', `return ${filterCondition};`);
      targetCustomers = customers.filter(c => {
        try { 
          return evaluationFunction(c); 
        } catch { 
          return false; 
        }
      });
    } catch (evalErr) {
      console.error("[CRM LOG] Filter evaluation error:", evalErr);
      return res.status(500).json({ error: "Gemini built an unstable code structure rule.", details: filterCondition });
    }

    const recipientCount = targetCustomers.length;
    if (recipientCount === 0) {
      return res.json({ message: `Gemini compiled rule condition: "${filterCondition}". 0 shoppers matched this.` });
    }

    // Accumulate total sent targets immediately
    campaignStats.totalSent += recipientCount;

    // Asynchronous delivery tracking simulated gateway infrastructure loops
    targetCustomers.forEach(customer => {
      setTimeout(() => {
        const isDelivered = Math.random() > 0.15; // 85% success barrier allocation
        if (isDelivered) {
          campaignStats.delivered += 1;
          setTimeout(() => {
            if (Math.random() > 0.40) { // 60% standard baseline open rate
              campaignStats.opened += 1;
            }
          }, 2000);
        } else {
          campaignStats.failed += 1;
        }
      }, 1500);
    });

    return res.json({
      message: `AI generated segment condition: "${filterCondition}". Campaign launched successfully to ${recipientCount} shoppers!`
    });

  } catch (error) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error("[AXIOS CRASH LOG] Complete details:", errorDetails);
    return res.status(500).json({ 
      error: "Failed to communicate with direct REST API pipeline.", 
      details: errorDetails 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`HTTP REST backend running smoothly on port ${PORT}`));