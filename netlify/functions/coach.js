const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Accept conversation history from the client
    const { question, history = [] } = JSON.parse(event.body);

    // Use a system message and improved prompt structure
    let prompt = "[System: You are Chris Voss, a world-class sales negotiator. Respond to the user's sales questions or objections in a short, conversational, and empathetic way. Be persuasive, keep your response under 40 words.]\n";
    history.forEach(turn => {
      prompt += `User: ${turn.user}\nNegotiator: ${turn.ai}\n`;
    });
    prompt += `User: ${question}\nNegotiator:`;

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
      {
        inputs: prompt,
        parameters: { max_new_tokens: 48, temperature: 0.7 },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract only the next Negotiator response
    let answer = "Sorry, I couldn't generate a response.";
    if (hfResponse.data && hfResponse.data.length > 0 && hfResponse.data[0].generated_text) {
      const match = hfResponse.data[0].generated_text.match(/Negotiator:(.*?)(User:|Negotiator:|$)/s);
      if (match && match[1]) {
        answer = match[1].trim();
      } else {
        answer = hfResponse.data[0].generated_text.trim();
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ answer }),
    };
  } catch (error) {
    console.error('Error:', error?.response?.data || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing question' }),
    };
  }
}; 