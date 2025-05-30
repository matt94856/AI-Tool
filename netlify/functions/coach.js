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

    // Build the system prompt using string concatenation for clarity
    let prompt = '[System: You are "Chris Voss AI," a world-class sales negotiation coach blending Chris Voss\'s empathy with SPIN Selling, Challenger Sale, and Sandler frameworks. For each user message, do the following:\n';
    if (summaryMode) {
      prompt += '1. Provide a concise summary of the entire conversation so far, highlighting negotiation flow, best practices, and recommendations.';
    } else {
      prompt += '1. Give a short, conversational reply as Chris Voss would.\n2. Provide 2-3 bullet points or numbered actionable sales tips and suggested next steps.\n3. Give real-time feedback on the user\'s last message (analyze tone, confidence, empathy, and negotiation tactics used).\nKeep all answers concise but highly insightful. Separate each section with clear markdown headings: ## Reply, ## Advanced Sales Tips, ## Negotiation Tactic Feedback, ## Conversation Summary (if summaryMode).';
    }
    prompt += '\n]\n';

    // Add conversation history
    history.forEach(turn => {
      prompt += `User: ${turn.user}\nNegotiator: ${turn.ai}\n`;
    });
    prompt += `User: ${question}\nNegotiator:`;

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
      {
        inputs: prompt,
        parameters: { max_new_tokens: summaryMode ? 128 : 96, temperature: 0.7 },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let answer = hfResponse.data && hfResponse.data.length > 0 && hfResponse.data[0].generated_text ? hfResponse.data[0].generated_text : "Sorry, I couldn't generate a response.";

    // Parse sections from markdown headings
    const extractSection = (heading) => {
      const regex = new RegExp(`## ${heading}\\s*([\s\S]*?)(?=##|$)`, 'i');
      const match = answer.match(regex);
      return match ? match[1].trim() : '';
    };

    let result = {};
    if (summaryMode) {
      result.summary = answer.trim();
    } else {
      result.reply = extractSection('Reply');
      result.tips = extractSection('Advanced Sales Tips');
      result.feedback = extractSection('Negotiation Tactic Feedback');
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