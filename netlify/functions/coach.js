const axios = require('axios');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { question } = JSON.parse(event.body);

    // Prompt for concise, empathetic, and persuasive negotiation (Chris Voss style)
    const prompt = `You are a world-class sales negotiator like Chris Voss. Answer the user's sales question or objection in a short, conversational, and empathetic way. Be persuasive, but keep your response under 40 words.\n\nUser: ${question}\nNegotiator:`;

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

    const answer = (hfResponse.data && hfResponse.data.length > 0 && hfResponse.data[0].generated_text) || "Sorry, I couldn't generate a response.";

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