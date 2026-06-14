const express = require('express');
const cors = require('cors');
const axios = require('axios');
const customers = require('./dataset.json');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const apiKey = process.env.GEMINI_API_KEY;

let campaignStats = {
  totalSent: 0,
  delivered: 0,
  opened: 0,
  failed: 0
};

app.get('/api/stats', (req, res) => {
  res.json(campaignStats);
});

app.get('/api/customers', (req, res) => {
  res.json(customers);
});

app.post('/api/campaigns/send', async (req, res) => {
  const { prompt, channel } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: "Missing campaign segmentation prompt."
    });
  }

  if (!apiKey) {
    console.error("[CRITICAL CONFIG ERROR] GEMINI_API_KEY missing!");
    return res.status(500).json({
      error: "Backend server configuration missing authentication parameters."
    });
  }

  try {

    console.log(`[HTTP REST API] Handshaking directly with Google for prompt: "${prompt}"`);

    const systemInstruction = `
      You are an expert database engine assistant.
      Your single task is to translate natural language user segment rules into a raw JavaScript filter condition.

      The shopper object variable name is 'c'.

      Available properties on 'c':
      - c.lastOrderDaysAgo (number)
      - c.totalOrders (number)
      - c.totalSpent (number)
      - c.preferredCategory (string)

      CRITICAL RULES:
      - Output ONLY the clean condition string.
      - Never include backticks, javascript, wrapping quotes, or punctuation marks.

      Example Input:
      Find customers who haven't ordered in 90 days

      Example Output:
      c.lastOrderDaysAgo > 90
    `;

    // TRYING GEMINI 2.5 FLASH
    const googleEndpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    console.log("=================================");
    console.log("GOOGLE ENDPOINT =>", googleEndpoint);
    console.log("API KEY EXISTS =>", !!apiKey);
    console.log("PROMPT =>", prompt);
    console.log("=================================");

    const googleResponse = await axios.post(
      googleEndpoint,
      {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nUser Request to translate: "${prompt}"`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1
        }
      }
    );

    console.log(
      "GOOGLE RAW RESPONSE =>",
      JSON.stringify(googleResponse.data, null, 2)
    );

    const rawAiText =
      googleResponse.data.candidates[0].content.parts[0].text;

    const filterCondition = rawAiText
      .trim()
      .replace(/```javascript|```/g, '')
      .trim();

    console.log("FILTER CONDITION =>", filterCondition);

    let targetCustomers = [];

    try {
      const evaluationFunction = new Function(
        'c',
        `return ${filterCondition};`
      );

      targetCustomers = customers.filter(c => {
        try {
          return evaluationFunction(c);
        } catch {
          return false;
        }
      });

    } catch (evalErr) {

      console.error("FILTER EVALUATION ERROR =>", evalErr);

      return res.status(500).json({
        error: "Gemini built an unstable code structure rule.",
        details: filterCondition
      });
    }

    const recipientCount = targetCustomers.length;

    if (recipientCount === 0) {
      return res.json({
        message: `Gemini compiled rule condition: "${filterCondition}". 0 shoppers matched this.`
      });
    }

    campaignStats.totalSent += recipientCount;

    targetCustomers.forEach(customer => {

      setTimeout(() => {

        const isDelivered = Math.random() > 0.15;

        if (isDelivered) {

          campaignStats.delivered++;

          setTimeout(() => {
            if (Math.random() > 0.40) {
              campaignStats.opened++;
            }
          }, 2000);

        } else {

          campaignStats.failed++;
        }

      }, 1500);

    });

    return res.json({
      message: `AI generated segment condition: "${filterCondition}". Campaign launched successfully to ${recipientCount} shoppers!`
    });

  } catch (error) {

    console.error("=========== FULL ERROR ===========");

    if (error.response) {

      console.error(
        JSON.stringify(error.response.data, null, 2)
      );

    } else {

      console.error(error);
    }

    console.error("==================================");

    const errorDetails = error.response
      ? error.response.data
      : error.message;

    return res.status(500).json({
      error: "Failed to communicate with direct REST API pipeline.",
      details: errorDetails
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HTTP REST backend running smoothly on port ${PORT}`);
});