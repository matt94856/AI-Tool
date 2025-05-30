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

    // Build Zephyr chat template prompt (short, fast)
    let prompt = '';
    prompt += '<|system|>\n';
    prompt += 'You are Chris Voss AI, a world-class sales negotiation coach. Use the following sections: ### Reply, ### Advanced Sales Tips, ### Negotiation Tactic Feedback.\n';
    prompt += '</s>\n';
    // Only include the latest user message
    if (!summaryMode) {
      prompt += '<|user|>\n' + question + '</s>\n<|assistant|>\n';
    } else {
      prompt += '<|user|>\nSummarize the negotiation so far, highlight best practices and recommendations.</s>\n<|assistant|>\n';
    }

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
      {
        inputs: prompt,
        parameters: { max_new_tokens: summaryMode ? 64 : 64, temperature: 0.7 },
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

    // Parse sections from headings in the assistant output
    const extractSection = (heading) => {
      const regex = new RegExp(`### ${heading}\\s*([\\s\\S]*?)(?=###|$)`, 'i');
      const match = assistantOutput.match(regex);
      return match ? match[1].trim() : '';
    };

    let result = {};
    if (summaryMode) {
      result.summary = assistantOutput.trim();
    } else {
      // If the Reply section is missing, use the whole assistant output as the reply
      const replySection = extractSection('Reply');
      result.reply = replySection && replySection.length > 0 ? replySection : assistantOutput.trim();
      const tipsSection = extractSection('Advanced Sales Tips');
      result.tips = tipsSection && tipsSection.length > 0 ? tipsSection : '';
      const feedbackSection = extractSection('Negotiation Tactic Feedback');
      result.feedback = feedbackSection && feedbackSection.length > 0 ? feedbackSection : '';
      result.summary = extractSection('Conversation Summary');
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
    console.error('Error:', error?.response?.data || error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error processing question' }),
    };
  }
}; 