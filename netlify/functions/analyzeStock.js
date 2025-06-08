const yahooFinance = require('yahoo-finance2').default;
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.MY_HF_TOKEN);

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
    const symbol = stock.ticker;
    // Fetch Yahoo Finance data for the stock
    let stockData;
    try {
      const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'financialData', 'balanceSheetHistory', 'summaryProfile'] });
      stockData = {
        symbol,
        name: quote.price?.longName || stock.name || symbol,
        industry: quote.summaryProfile?.industry || stock.industry || 'N/A',
        currentPrice: quote.price?.regularMarketPrice ?? 0,
        marketCap: quote.price?.marketCap ?? 0,
        beta: quote.summaryDetail?.beta ?? 0,
        dividendYield: (quote.summaryDetail?.dividendYield ?? 0) * 100,
        debtToEquity: quote.financialData?.debtToEquity ?? 0,
        cash: quote.financialData?.totalCash ?? 0,
        equity: quote.balanceSheetHistory?.balanceSheetStatements?.[0]?.totalStockholderEquity ?? 0
      };
    } catch (e) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Stock not found or Yahoo Finance error' }) };
    }
    // Build Warren Buffett AI prompt
    const aiPrompt = buildAIDeepAnalysisPrompt(preferences, stockData);
    // Get AI analysis
    let aiResult = { analysis: '' };
    try {
      aiResult = await getAIAnalysis(aiPrompt);
    } catch (aiError) {
      aiResult.analysis = 'AI analysis unavailable at this time.';
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
  return `You are Warren Buffett. Analyze the following stock for a long-term investor with these preferences:\n\nUser Profile:\n- Desired Return: ${prefs.desiredGrowth}%\n- Risk Tolerance: ${prefs.riskTolerance}/10\n- Notes: ${prefs.additionalNotes || 'None'}\n\nStock Data:\n- Symbol: ${stock.symbol}\n- Name: ${stock.name}\n- Industry: ${stock.industry}\n- Current Price: $${stock.currentPrice}\n- Market Cap: $${stock.marketCap ? (stock.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}\n- Beta: ${stock.beta}\n- Dividend Yield: ${stock.dividendYield}%\n- Debt to Equity: ${stock.debtToEquity}\n- Cash: $${stock.cash}\n- Equity: $${stock.equity}\n\nInstructions:\n- Provide a detailed, plain-English analysis of this stock's financial health, growth prospects, and risks.\n- Focus on what matters most for a long-term, value-oriented investor.\n- Conclude with a summary: Would you consider this stock a good fit for the user? Why or why not?`;
}

async function getAIAnalysis(prompt) {
  const response = await hf.textGeneration({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    inputs: prompt,
    parameters: {
      max_new_tokens: 400,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.2,
      return_full_text: false
    }
  });
  return { analysis: response.generated_text.trim() };
} 