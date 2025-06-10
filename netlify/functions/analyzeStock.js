const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.MY_HF_TOKEN);

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timed out')), ms))
  ]);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { stock, preferences } = JSON.parse(event.body);
    if (!stock || !stock.ticker || !preferences) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing stock or preferences' }) };
    }
    // Use the provided stock data directly
    const stockData = {
      symbol: stock.ticker,
      name: stock.name,
      industry: stock.industry,
      currentPrice: stock.currentPrice,
      marketCap: stock.marketCap,
      beta: stock.beta,
      dividendYield: stock.dividendYield,
      debtToEquity: stock.debtToEquity,
      cash: stock.cash,
      equity: stock.equity
    };
    // Build concise Warren Buffett AI prompt
    const aiPrompt = buildAIDeepAnalysisPrompt(preferences, stockData);
    // Get AI analysis with timeout and lower max tokens
    let aiResult = { analysis: '' };
    try {
      aiResult = await withTimeout(getAIAnalysis(aiPrompt), 8000); // 8 seconds
    } catch (aiError) {
      aiResult.analysis = 'AI analysis unavailable at this time (timeout).';
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analysis: aiResult.analysis, stockData })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze stock', details: error.message })
    };
  }
};

function buildAIDeepAnalysisPrompt(prefs, stock) {
  // Concise, focused prompt for a complete answer in 200 tokens
  return `You are Warren Buffett. Analyze this stock for a long-term investor with these preferences:\n\nUser: Desired Return: ${prefs.desiredGrowth}%, Risk Tolerance: ${prefs.riskTolerance}/10, Notes: ${prefs.additionalNotes || 'None'}\nStock: ${stock.symbol} (${stock.name}), Industry: ${stock.industry}, Price: $${stock.currentPrice}, Market Cap: $${stock.marketCap ? (stock.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}, Beta: ${stock.beta}, Dividend Yield: ${stock.dividendYield}%, Debt/Equity: ${stock.debtToEquity}, Cash: $${stock.cash}, Equity: $${stock.equity}\n\nIn 5-7 sentences, assess the stock's financial health, growth prospects, and risks for this user. Conclude: Is it a good fit?`;
}

async function getAIAnalysis(prompt) {
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    inputs: prompt,
    parameters: {
      max_new_tokens: 200,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.2,
      return_full_text: false
    }
  });
  return { analysis: response.generated_text.trim() };
} 