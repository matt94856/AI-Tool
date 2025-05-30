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

    // Build Zephyr chat template prompt (strict word limit)
    let prompt = '';
    prompt += '<|system|>\n';
    prompt += 'You are a world-class sales negotiation coach. For general or social questions, respond empathetically and conversationally, without referencing Chris Voss or his techniques. For specific negotiation or sales scenarios, provide practical, empathetic advice. If a Chris Voss negotiation technique (like Mirroring, Labeling, Tactical Empathy, etc.) is directly relevant, briefly mention and explain it as part of your advice, but only if it truly applies. Never claim to be Chris Voss. Keep every response under 40 words. Never exceed 40 words.';
    prompt += '</s>\n';
    // Only include the latest user message
    if (!summaryMode) {
      prompt += '<|user|>\n' + question + '</s>\n<|assistant|>\n';
    } else {
      prompt += '<|user|>\nSummarize the negotiation so far, highlight best practices and recommendations. Only mention Chris Voss techniques if directly relevant. Keep the summary under 40 words. Never exceed 40 words.</s>\n<|assistant|>\n';
    }

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
      {
        inputs: prompt,
        parameters: { max_new_tokens: summaryMode ? 96 : 96, temperature: 0.7 },
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MY_HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 7000, // 7 seconds timeout to avoid Netlify 10s hard limit
      }
    );

    // Robustly extract the answer from Zephyr's response
    let answer = '';
    if (Array.isArray(hfResponse.data) && hfResponse.data.length > 0) {
      if (hfResponse.data[0].generated_text) {
        answer = hfResponse.data[0].generated_text;
      } else if (typeof hfResponse.data[0] === 'string') {
        answer = hfResponse.data[0];
      } else if (hfResponse.data[0].text) {
        answer = hfResponse.data[0].text;
      }
    } else if (typeof hfResponse.data === 'string') {
      answer = hfResponse.data;
    } else if (hfResponse.data.generated_text) {
      answer = hfResponse.data.generated_text;
    } else if (hfResponse.data.text) {
      answer = hfResponse.data.text;
    } else {
      answer = "Sorry, I couldn't generate a response.";
    }

    // Log the raw response for debugging
    console.log('Raw Hugging Face response:', JSON.stringify(hfResponse.data));

    // Extract only the latest assistant output
    const parts = answer.split('<|assistant|>');
    const assistantOutput = parts.length > 1 ? parts[parts.length - 1] : answer;

    let result = {};
    if (summaryMode) {
      result.summary = assistantOutput.trim();
    } else {
      result.reply = assistantOutput.trim();
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout error from Hugging Face API');
      return {
        statusCode: 504,
        body: JSON.stringify({ error: 'The AI model took too long to respond. Please try again or ask a shorter question.' }),
      };
    }
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Hugging Face API error:', error.response.data.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.response.data.error }),
      };
    }
    console.error('Error:', error?.response?.data || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing question' }),
    };
  }
}; 