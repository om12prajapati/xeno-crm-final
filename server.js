const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const apiKey = process.env.GEMINI_API_KEY;
const DATASET_PATH = path.join(__dirname, 'dataset.json');

// Memory tracker for campaign stats
let campaignStats = {
  totalSent: 0,
  delivered: 0,
  opened: 0,
  failed: 0
};

// Helper: read customer database dynamically
async function getCustomers() {
  try {
    const data = await fs.readFile(DATASET_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("[DATABASE] Error reading dataset.json, returning fallback:", err);
    return [];
  }
}

// Helper: save customer database
async function saveCustomers(data) {
  try {
    await fs.writeFile(DATASET_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("[DATABASE] Error saving dataset.json:", err);
  }
}

// Campaign launch helper logic (shared between standard route & copilot chatbot)
async function triggerCampaignLaunch(prompt, channel, customersList) {
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

  const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const googleResponse = await axios.post(googleEndpoint, {
    contents: [{
      parts: [{
        text: `${systemInstruction}\n\nUser Request to translate: "${prompt}"`
      }]
    }],
    generationConfig: { temperature: 0.1 }
  });

  const rawAiText = googleResponse.data.candidates[0].content.parts[0].text;
  const filterCondition = rawAiText.trim().replace(/```javascript|```/g, '').trim();

  console.log(`[CAMPAIGN ENGINE] Compiled filter condition: "${filterCondition}"`);

  let targetCustomers = [];
  const evaluationFunction = new Function('c', `return ${filterCondition};`);

  targetCustomers = customersList.filter(c => {
    try {
      return evaluationFunction(c);
    } catch {
      return false;
    }
  });

  const recipientCount = targetCustomers.length;

  if (recipientCount > 0) {
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
  }

  return {
    filterCondition,
    recipientCount,
    message: `AI generated segment condition: "${filterCondition}". Campaign launched successfully to ${recipientCount} shoppers!`
  };
}

// REST Endpoints
app.get('/api/stats', (req, res) => {
  res.json(campaignStats);
});

// Dynamic Customers Listing
app.get('/api/customers', async (req, res) => {
  const data = await getCustomers();
  res.json(data);
});

// Manual Customer CRUD: Create
app.post('/api/customers', async (req, res) => {
  try {
    const list = await getCustomers();
    const newCustomer = {
      id: `cust_${Date.now()}`,
      name: req.body.name || "Unnamed Shopper",
      email: req.body.email || "",
      phone: req.body.phone || "",
      totalOrders: Number(req.body.totalOrders) || 0,
      totalSpent: Number(req.body.totalSpent) || 0,
      lastOrderDaysAgo: Number(req.body.lastOrderDaysAgo) || 0,
      preferredCategory: req.body.preferredCategory || "Apparel"
    };
    list.push(newCustomer);
    await saveCustomers(list);
    res.json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: "Failed to add customer", details: err.message });
  }
});

// Manual Customer CRUD: Update
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await getCustomers();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    list[idx] = {
      ...list[idx],
      name: req.body.name !== undefined ? req.body.name : list[idx].name,
      email: req.body.email !== undefined ? req.body.email : list[idx].email,
      phone: req.body.phone !== undefined ? req.body.phone : list[idx].phone,
      totalOrders: req.body.totalOrders !== undefined ? Number(req.body.totalOrders) : list[idx].totalOrders,
      totalSpent: req.body.totalSpent !== undefined ? Number(req.body.totalSpent) : list[idx].totalSpent,
      lastOrderDaysAgo: req.body.lastOrderDaysAgo !== undefined ? Number(req.body.lastOrderDaysAgo) : list[idx].lastOrderDaysAgo,
      preferredCategory: req.body.preferredCategory !== undefined ? req.body.preferredCategory : list[idx].preferredCategory
    };

    await saveCustomers(list);
    res.json(list[idx]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update customer", details: err.message });
  }
});

// Manual Customer CRUD: Delete
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let list = await getCustomers();
    const filtered = list.filter(c => c.id !== id);
    if (list.length === filtered.length) {
      return res.status(404).json({ error: "Customer not found" });
    }
    await saveCustomers(filtered);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete customer", details: err.message });
  }
});

// Launch AI Campaign Form submission
app.post('/api/campaigns/send', async (req, res) => {
  const { prompt, channel } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing campaign segmentation prompt." });
  }

  if (!apiKey) {
    console.error("[CRITICAL CONFIG ERROR] GEMINI_API_KEY missing!");
    return res.status(500).json({ error: "Backend server configuration missing API key." });
  }

  try {
    const list = await getCustomers();
    const result = await triggerCampaignLaunch(prompt, channel, list);
    return res.json({ message: result.message });
  } catch (error) {
    console.error("[CAMPAIGN ERROR]", error);
    return res.status(500).json({ error: "Failed to compile segment rules", details: error.message });
  }
});

// AI Copilot Agent Chatbot route
app.post('/api/copilot', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Empty message prompt received." });
  }

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API key configuration missing on backend." });
  }

  try {
    const list = await getCustomers();

    const systemPrompt = `
      You are the Xeno CRM AI Copilot, a highly capable AI agent that manages and analyzes customer databases.
      
      You have access to the current customer list. You can answer general business questions, write email templates, draft SMSes, summarize shopper trends, or execute dynamic operations on the database (like adding, editing, deleting shoppers, or launching campaigns).

      CURRENT CUSTOMER DATABASE:
      ${JSON.stringify(list, null, 2)}

      OPERATIONAL DIRECTIVES:
      If the user wants to perform an action, you must return a structured JSON response inside a markdown block.
      Supported Actions:
      1. Add Customer:
         - Action Type: "add_customer"
         - Data fields: name (string), email (string), phone (string), totalOrders (number), totalSpent (number), lastOrderDaysAgo (number), preferredCategory (string)
      2. Delete Customer:
         - Action Type: "delete_customer"
         - Data fields: id (string)
      3. Launch Campaign:
         - Action Type: "launch_campaign"
         - Data fields: prompt (string, segment description), channel (string, e.g., "WhatsApp", "SMS", "Email")

      FORMAT RULES:
      If you are performing an action, return a JSON object containing three fields: "reply" (what to say to the user), "action" (the action type, either "add_customer", "delete_customer", or "launch_campaign") and "actionData" (the parameters).
      Format example for action response:
      \`\`\`json
      {
        "reply": "I'm adding Rohit Sharma to the database.",
        "action": "add_customer",
        "actionData": {
          "name": "Rohit Sharma",
          "email": "rohit@example.com",
          "phone": "+919999911111",
          "totalOrders": 2,
          "totalSpent": 5000,
          "lastOrderDaysAgo": 0,
          "preferredCategory": "Apparel"
        }
      }
      \`\`\`

      If the user is just asking a question (e.g. "Who spent the most?"), you do NOT need to return an action. Just return a standard helpful reply text.
    `;

    const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const googleResponse = await axios.post(googleEndpoint, {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\nUser Request: "${message}"`
        }]
      }],
      generationConfig: { temperature: 0.2 }
    });

    const responseText = googleResponse.data.candidates[0].content.parts[0].text;
    console.log("[COPILOT RAW AI RESPONSE]", responseText);

    // Try parsing action from JSON markdown block
    let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
    let actionObj = null;
    let replyText = responseText;

    if (jsonMatch) {
      try {
        actionObj = JSON.parse(jsonMatch[1].trim());
        replyText = actionObj.reply || "Action processed.";
      } catch (e) {
        console.error("[COPILOT] JSON markdown parsing failed:", e);
      }
    } else {
      // Check if whole response is JSON
      try {
        actionObj = JSON.parse(responseText.trim());
        replyText = actionObj.reply || "Action processed.";
      } catch (e) {
        // Just text response
      }
    }

    // Execute backend actions dynamically if parsed
    if (actionObj && actionObj.action) {
      console.log(`[COPILOT AGENT] Executing action: "${actionObj.action}"`, actionObj.actionData);
      
      if (actionObj.action === "add_customer" && actionObj.actionData) {
        const newCustomer = {
          id: `cust_${Date.now()}`,
          name: actionObj.actionData.name || "Unnamed",
          email: actionObj.actionData.email || "",
          phone: actionObj.actionData.phone || "",
          totalOrders: Number(actionObj.actionData.totalOrders) || 0,
          totalSpent: Number(actionObj.actionData.totalSpent) || 0,
          lastOrderDaysAgo: Number(actionObj.actionData.lastOrderDaysAgo) || 0,
          preferredCategory: actionObj.actionData.preferredCategory || "Apparel"
        };
        list.push(newCustomer);
        await saveCustomers(list);
        replyText += `\n\n*[System Executed: Customer "${newCustomer.name}" was successfully added to database]*`;
      } 
      
      else if (actionObj.action === "delete_customer" && actionObj.actionData && actionObj.actionData.id) {
        const targetId = actionObj.actionData.id;
        const filtered = list.filter(c => c.id !== targetId);
        await saveCustomers(filtered);
        replyText += `\n\n*[System Executed: Customer with ID "${targetId}" deleted from database]*`;
      } 
      
      else if (actionObj.action === "launch_campaign" && actionObj.actionData) {
        const result = await triggerCampaignLaunch(
          actionObj.actionData.prompt, 
          actionObj.actionData.channel || "WhatsApp", 
          list
        );
        replyText += `\n\n*[System Executed Campaign: Channel "${actionObj.actionData.channel}" targeting ${result.recipientCount} matching shoppers (Rule compiled: "${result.filterCondition}")]*`;
      }
    }

    return res.json({ reply: replyText });

  } catch (error) {
    console.error("[COPILOT ERROR]", error);
    return res.status(500).json({ error: "Failed to communicate with Copilot API.", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HTTP REST backend running smoothly on port ${PORT}`);
});