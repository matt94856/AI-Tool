const yahooFinance = require('yahoo-finance2').default;
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.MY_HF_TOKEN);

const allStocks = require('../../sp500.json');

// Map of user-friendly industry names to actual industry categories
const industryMap = {
  'energy': ['energy', 'oil', 'gas', 'petroleum', 'utilities'],
  'technology': ['technology', 'software', 'hardware', 'semiconductor', 'internet'],
  'healthcare': ['healthcare', 'medical', 'pharmaceutical', 'biotech'],
  'finance': ['finance', 'banking', 'insurance', 'financial'],
  'consumer': ['consumer', 'retail', 'food', 'beverage', 'apparel'],
  'industrial': ['industrial', 'manufacturing', 'aerospace', 'defense'],
  'materials': ['materials', 'chemical', 'mining', 'metals'],
  'utilities': ['utilities', 'electric', 'water', 'gas'],
  'real estate': ['real estate', 'reit', 'property'],
  'telecom': ['telecom', 'telecommunications', 'wireless']
};

// Ensure all required fields have default values
function createStockObject(stock) {
  return {
    ticker: stock.symbol || '',
    name: stock.name || stock.symbol || 'Unknown Company',
    industry: stock.industry || 'Unknown Industry',
    sector: stock.sector || 'Unknown Sector',
    marketCap: stock.marketCap || 0,
    currentPrice: 0,
    priceChangePercent: 0,
    beta: 1,
    dividendYield: 0,
    debtToEquity: 0,
    cash: 0,
    equity: 0,
    roe: 0,
    peRatio: 0,
    rationale: `${stock.name || stock.symbol} (${stock.industry || 'Unknown Industry'}) - Market Cap: $${((stock.marketCap || 0) / 1e9).toFixed(2)}B`
  };
}

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
    console.log('Received preferences:', preferences);
    
    // Convert minMarketCap to number if it exists
    const minMarketCap = preferences.minMarketCap ? Number(preferences.minMarketCap) : 0;
    console.log('Min market cap (as number):', minMarketCap);

    // Log unique industries in our dataset
    const uniqueIndustries = [...new Set(allStocks.map(stock => stock.industry))];
    console.log('Available industries in dataset:', uniqueIndustries);
    
    // Filter stocks by industry and market cap
    let filtered = allStocks.filter(stock => {
      let matchesIndustry = true;
      if (preferences.industry) {
        const userIndustry = preferences.industry.toLowerCase();
        const stockIndustry = (stock.industry || '').toLowerCase();
        
        // Check if the stock's industry matches any of the mapped categories
        matchesIndustry = industryMap[userIndustry]?.some(category => 
          stockIndustry.includes(category)
        ) || stockIndustry.includes(userIndustry);

        if (matchesIndustry) {
          console.log(`Industry match found for ${stock.symbol}:`, {
            userIndustry,
            stockIndustry,
            matches: true
          });
        }
      }
      
      const meetsMarketCap = minMarketCap > 0 
        ? (stock.marketCap || 0) >= minMarketCap
        : true;

      if (matchesIndustry && meetsMarketCap) {
        console.log(`Stock ${stock.symbol} matches all criteria:`, {
          industry: stock.industry,
          marketCap: stock.marketCap,
          minRequired: minMarketCap
        });
      }
      
      return matchesIndustry && meetsMarketCap;
    });

    console.log(`Found ${filtered.length} stocks after initial filtering`);

    // Sort by market cap and take top 20
    const recommendedStocks = filtered
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 20)
      .map(stock => createStockObject(stock));

    console.log(`Returning ${recommendedStocks.length} recommended stocks`);

    // Log the first stock to verify structure
    if (recommendedStocks.length > 0) {
      console.log('First stock structure:', recommendedStocks[0]);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recommendations: recommendedStocks })
    };
  } catch (error) {
    console.error('Error in analyze function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to filter stocks', 
        details: error.message 
      })
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