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

    // Simplified prompt for faster response
    const prompt = `Sales question: ${question}\nAnswer:`;

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Llama 3.1 returns an array of results
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