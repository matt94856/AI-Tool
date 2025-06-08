const yahooFinance = require('yahoo-finance2').default;
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.MY_HF_TOKEN);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const preferences = JSON.parse(event.body);
    const allStocks = require('../../sp500.json');
    // Filter by industry and market cap
    let filtered = allStocks.filter(stock => {
      let matchesIndustry = true;
      if (preferences.industry) {
        matchesIndustry = stock.industry && stock.industry.toLowerCase().includes(preferences.industry.toLowerCase());
      }
      const meetsMarketCap = preferences.minMarketCap
        ? stock.marketCap >= preferences.minMarketCap
        : true;
      return matchesIndustry && meetsMarketCap;
    });
    // Fetch Yahoo Finance data for all filtered stocks
    const detailedStocks = await Promise.all(filtered.map(async (stock) => {
      try {
        const quote = await yahooFinance.quoteSummary(stock.symbol, { modules: ['price', 'summaryDetail', 'financialData', 'balanceSheetHistory'] });
        return {
          ...stock,
          currentPrice: quote.price?.regularMarketPrice ?? 0,
          marketCap: quote.price?.marketCap ?? 0,
          beta: quote.summaryDetail?.beta ?? 0,
          dividendYield: (quote.summaryDetail?.dividendYield ?? 0) * 100,
          debtToEquity: quote.financialData?.debtToEquity ?? 0,
          cash: quote.financialData?.totalCash ?? 0,
          equity: quote.balanceSheetHistory?.balanceSheetStatements?.[0]?.totalStockholderEquity ?? 0
        };
      } catch (e) {
        return stock;
      }
    }));
    // Score and sort
    const scored = detailedStocks.map(stock => ({ ...stock, score: scoreStock(stock, preferences) }))
      .sort((a, b) => b.score - a.score);
    // Build AI prompt
    const aiPrompt = buildAIPrompt(preferences, scored.slice(0, 5));
    // Get AI recommendations
    let aiResult = { recommendations: [] };
    try {
      aiResult = await getAIRecommendations(aiPrompt);
    } catch (aiError) {
      aiResult.recommendations = scored.slice(0, 5).map(s => ({ ticker: s.symbol, rationale: 'AI unavailable, but this stock fits your profile.' }));
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recommendations: aiResult.recommendations })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze stocks', details: error.message })
    };
  }
};

function scoreStock(stock, prefs) {
  let score = 0;
  if (stock.beta) score += 100 - Math.abs((stock.beta * 10) - prefs.riskTolerance * 10);
  if (stock.roe) score += 100 - Math.abs(stock.roe - prefs.desiredGrowth);
  if (prefs.additionalNotes && typeof prefs.additionalNotes === 'string') {
    const notes = prefs.additionalNotes.toLowerCase();
    if (notes.includes('tech') && stock.industry.toLowerCase().includes('tech')) score += 50;
    if (notes.includes('avoid fossil') && stock.industry.toLowerCase().includes('energy')) score -= 100;
    if (notes.includes('dividend') && stock.dividendYield > 2) score += 30;
  }
  return score;
}

function buildAIPrompt(prefs, stocks) {
  let prompt = `You are a world-class investment analyst. Given the following user profile and stock data, recommend the top 3–5 stocks that best fit the user's preferences.\n\nUser Profile:\n- Desired Return: ${prefs.desiredGrowth}%\n- Risk Tolerance: ${prefs.riskTolerance}/10\n- Notes: ${prefs.additionalNotes || 'None'}\n\nCandidate Stocks:`;
  stocks.forEach((s, i) => {
    prompt += `\n${i + 1}. ${s.symbol} | ${s.industry} | Beta: ${s.beta || 'N/A'} | Dividend: ${s.dividendYield || 'N/A'}% | Market Cap: $${s.marketCap ? (s.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}`;
  });
  prompt += `\n\nInstructions:\n- Score each stock for fit to the user's risk, return, and notes.\n- Recommend the top 3–5 tickers, with a brief rationale for each.\n- Be diverse in your selections if possible.\n- Output as a numbered list: Ticker, Rationale.`;
  return prompt;
}

async function getAIRecommendations(prompt) {
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    inputs: prompt,
    parameters: {
      max_new_tokens: 350,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.2,
      return_full_text: false
    }
  });
  const lines = response.generated_text.split(/\n|\r/).filter(l => l.match(/^\d+\./));
  const recommendations = lines.map(line => {
    const match = line.match(/^\d+\.\s*([A-Z]+)\s*[,|-]\s*(.*)$/i);
    return match ? { ticker: match[1], rationale: match[2].trim() } : { ticker: line, rationale: '' };
  });
  return { recommendations };
} 