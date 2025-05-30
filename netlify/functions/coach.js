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

    const prompt = `You are a world-class sales coach. A user has asked: "${question}"
\nPlease provide helpful, actionable sales tips and offer multiple solutions or approaches.`;

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-0528',
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = hfResponse.data.generated_text || (hfResponse.data[0] && hfResponse.data[0].generated_text) || "Sorry, I couldn't generate a response.";

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