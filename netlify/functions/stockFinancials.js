const yahooFinance = require('yahoo-finance2').default;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const symbol = event.queryStringParameters && event.queryStringParameters.symbol;
  if (!symbol) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing symbol parameter' }) };
  }

  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'summaryProfile'] });
    const financials = {
      currentPrice: quote.price?.regularMarketPrice ?? 0,
      marketCap: quote.price?.marketCap ?? 0,
      priceChangePercent: quote.price?.regularMarketChangePercent ?? 0,
      dividendYield: (quote.summaryDetail?.dividendYield ?? 0) * 100,
      beta: quote.summaryDetail?.beta ?? 0,
      peRatio: quote.summaryDetail?.trailingPE ?? quote.defaultKeyStatistics?.trailingPE ?? 0,
      forwardPE: quote.summaryDetail?.forwardPE ?? quote.defaultKeyStatistics?.forwardPE ?? 0,
      returnOnEquity: quote.financialData?.returnOnEquity ?? 0,
      profitMargin: quote.financialData?.profitMargins ?? 0,
      operatingMargin: quote.financialData?.operatingMargins ?? 0,
      currentRatio: quote.financialData?.currentRatio ?? 0,
      quickRatio: quote.financialData?.quickRatio ?? 0,
      debtToEquity: quote.financialData?.debtToEquity ?? 0,
      cash: quote.financialData?.totalCash ?? 0,
    };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(financials)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch Yahoo financials', details: error.message })
    };
  }
}; 