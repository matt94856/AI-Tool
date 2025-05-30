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

    // Build Zephyr chat template prompt
    let prompt = '';
    prompt += '<|system|>\n';
    prompt += 'You are Chris Voss AI, a world-class sales negotiation coach. Reply as Chris Voss would, then give 2-3 bullet sales tips and a brief feedback on the user\'s last message. Use these sections:\n### Reply\n### Advanced Sales Tips\n### Negotiation Tactic Feedback\n';
    prompt += '</s>\n';
    // Add conversation history
    limitedHistory.forEach(turn => {
      prompt += '<|user|>\n' + turn.user + '</s>\n';
      prompt += '<|assistant|>\n' + turn.ai + '</s>\n';
    });
    if (!summaryMode) {
      prompt += '<|user|>\n' + question + '</s>\n<|assistant|>\n';
    } else {
      prompt += '<|user|>\nSummarize the negotiation so far, highlight best practices and recommendations.</s>\n<|assistant|>\n';
    }

    const hfResponse = await axios.post(
      'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
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