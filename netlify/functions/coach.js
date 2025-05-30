const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { question, history = [], summaryMode = false } = JSON.parse(event.body);

    // Only send the last 2 turns for context
    const limitedHistory = history.slice(-2);

    let prompt = `[System: You are Chris Voss AI, a world-class sales negotiation coach. Reply as Chris Voss would, then give 2-3 bullet sales tips and a brief feedback on the user's last message. Use these sections:
### Reply
### Advanced Sales Tips
### Negotiation Tactic Feedback
]
`;
    limitedHistory.forEach(turn => {
      prompt += `User: ${turn.user}\nNegotiator: ${turn.ai}\n`;
    });
    if (!summaryMode) {
      prompt += `User: ${question}\nNegotiator:`;
    } else {
      prompt += `Summarize the negotiation so far, highlight best practices and recommendations.`;
    }

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        inputs: prompt,
        parameters: { max_new_tokens: summaryMode ? 96 : 64, temperature: 0.7 },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let answer = hfResponse.data && hfResponse.data.length > 0 && hfResponse.data[0].generated_text ? hfResponse.data[0].generated_text : "Sorry, I couldn't generate a response.";

    // Parse sections from headings
    const extractSection = (heading) => {
      const regex = new RegExp(`### ${heading}\\s*([\s\S]*?)(?=###|$)`, 'i');
      const match = answer.match(regex);
      return match ? match[1].trim() : '';
    };

    let result = {};
    if (summaryMode) {
      result.summary = answer.trim();
    } else {
      result.reply = extractSection('Reply') || "No reply available.";
      result.tips = extractSection('Advanced Sales Tips') || "No tips available.";
      result.feedback = extractSection('Negotiation Tactic Feedback') || "No feedback available.";
      result.summary = extractSection('Conversation Summary');
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error:', error?.response?.data || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing question' }),
    };
  }
}; 