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

    // Build the system prompt with explicit output format and delimiters
    let prompt = `[System: You are "Chris Voss AI," a world-class sales negotiation coach blending Chris Voss's empathy with SPIN Selling, Challenger Sale, and Sandler frameworks.
For each user message, do the following:
${summaryMode
      ? `Summarize the entire conversation so far between the user and the AI coach. Highlight negotiation flow, best practices, and recommendations. Output only the summary, no extra dialogue.`
      : `1. Give a short, conversational reply as Chris Voss would.
2. Provide 2-3 bullet points or numbered actionable sales tips and suggested next steps.
3. Give real-time feedback on the user's last message (analyze tone, confidence, empathy, and negotiation tactics used).
Output your response in this format:
### Reply
<your reply>
### Advanced Sales Tips
<tips as bullet points or numbers>
### Negotiation Tactic Feedback
<feedback>
`}
]
`;

    // Add conversation history
    history.forEach(turn => {
      prompt += `User: ${turn.user}\nNegotiator: ${turn.ai}\n`;
    });
    if (!summaryMode) {
      prompt += `User: ${question}\nNegotiator:`;
    }

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
      {
        inputs: prompt,
        parameters: { max_new_tokens: summaryMode ? 160 : 96, temperature: 0.7 },
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