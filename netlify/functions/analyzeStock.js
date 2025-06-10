const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.MY_HF_TOKEN);

// Warm up Hugging Face on cold start
let hfWarmedUp = false;
async function warmUpHF() {
  if (!hfWarmedUp) {
    try {
      await hf.textGeneration({
        model: 'sarvamai/sarvam-m',
        inputs: 'Say hello.',
        parameters: { max_new_tokens: 5, temperature: 0.2 }
      });
      hfWarmedUp = true;
    } catch (e) {
      // Ignore errors
    }
  }
}

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

  await warmUpHF();

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
      peRatio: stock.peRatio,
      forwardPE: stock.forwardPE,
      returnOnEquity: stock.returnOnEquity,
      profitMargin: stock.profitMargin,
      operatingMargin: stock.operatingMargin,
      currentRatio: stock.currentRatio,
      quickRatio: stock.quickRatio,
      debtToEquity: stock.debtToEquity,
      cash: stock.cash
    };
    // Build improved Warren Buffett AI prompt
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
  return `You are Warren Buffett. Given the user profile and stock data below, provide a brief evaluation of the stock on each of Warren Buffett's four key factors:
1. Business quality
2. Management quality
3. Financial health
4. Intrinsic value

IMPORTANT: Do NOT repeat or mention any numbers or statistics from the stock data in your response. For each factor, write exactly one concise sentence (no more). Then, based on the user's preferences, conclude with exactly one clear, natural sentence such as 'This investment is a good choice for you because...' or 'This investment is a bad choice for you because...', and explain why in one sentence. Be brief and do not use any numbers in your answer.

User Preferences:
- Desired Return: ${prefs.desiredGrowth}%
- Risk Tolerance: ${prefs.riskTolerance}/10
- Notes: ${prefs.additionalNotes || 'None'}

Stock Data:
- Symbol: ${stock.symbol}
- Name: ${stock.name}
- Industry: ${stock.industry}
- Price: $${stock.currentPrice}
- Market Cap: $${stock.marketCap ? (stock.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}
- Beta: ${stock.beta}
- Dividend Yield: ${stock.dividendYield}%
- PE Ratio: ${stock.peRatio}
- Forward PE: ${stock.forwardPE}
- Return on Equity: ${stock.returnOnEquity}
- Profit Margin: ${stock.profitMargin}
- Operating Margin: ${stock.operatingMargin}
- Current Ratio: ${stock.currentRatio}
- Quick Ratio: ${stock.quickRatio}
- Debt/Equity: ${stock.debtToEquity}
- Cash: $${stock.cash}`;
}

async function getAIAnalysis(prompt) {
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    inputs: prompt,
    parameters: {
      max_new_tokens: 350,
      temperature: 0.2,
      top_p: 0.9,
      repetition_penalty: 1.2,
      return_full_text: false
    }
  });
  return { analysis: response.generated_text.trim() };
} 