import { z } from 'zod';
import { tool } from '@langchain/core/tools';

// News tool
export const searchNewsTool = tool(
  async (input) => {
    const { query, limit = 5, category = 'business' } = input as { query: string; limit?: number; category?: string };
    console.log('🔧 [TOOL DEBUG] searchNewsTool called with:', { query, limit, category });
    
    try {
      const apiKey = process.env.MEDIASTACK_API_KEY;
      if (!apiKey) {
        throw new Error('Mediastack API key not configured. Please add MEDIASTACK_API_KEY to your environment variables or configure it in the settings.');
      }
      
      console.log('🔧 [TOOL DEBUG] Using Mediastack API key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');

      const params = new URLSearchParams({
        access_key: apiKey,
        keywords: query,
        languages: 'en',
        limit: limit.toString(),
        sort: 'published_desc',
      });
      
      // Only add categories if it's a valid category
      if (category && category !== 'general') {
        params.append('categories', category);
      }

      const url = `http://api.mediastack.com/v1/news?${params}`;
      console.log('🔧 [TOOL DEBUG] Calling Mediastack API:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mediastack API error details:', errorText);
        
        if (response.status === 422) {
          throw new Error(`Mediastack API error: Invalid request parameters. This might be due to an invalid API key or unsupported parameters. Please check your MEDIASTACK_API_KEY.`);
        }
        
        throw new Error(`Mediastack API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        return {
          success: true,
          message: 'No news articles found for the given query.',
          articles: [],
          total: 0,
        };
      }

      const articles = data.data.map((article: Record<string, unknown>) => ({
        title: article.title,
        description: article.description,
        source: article.source,
        url: article.url,
        publishedAt: article.published_at,
        category: article.category,
      }));

      return {
        success: true,
        message: `Found ${articles.length} news articles about "${query}"`,
        articles,
        total: data.pagination.total,
      };
    } catch (error) {
      console.error('News search error:', error);
      
      let errorMessage = 'Failed to search news';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Mediastack API key is invalid or missing. Please configure your API key in settings.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access forbidden. Please check your Mediastack API key permissions.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `News search failed: ${error.message}`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        articles: [],
        total: 0,
      };
    }
  },
  {
    name: 'searchNews',
    description: 'Search for the latest financial and business news articles. Use this to get current market news, company updates, and financial developments.',
    schema: z.object({
      query: z.string().describe('Search query for news articles (e.g., "Apple stock", "Federal Reserve", "Tesla earnings")'),
      limit: z.number().optional().describe('Number of articles to return (default: 5, max: 100)'),
      category: z.string().optional().describe('News category: general, business, entertainment, health, science, sports, technology')
    }),
  }
);

// Stock data tool
export const searchStockDataTool = tool(
  async (input) => {
    const { symbol, limit = 30 } = input as { symbol: string; limit?: number };
    console.log('🔧 [TOOL DEBUG] searchStockDataTool called with:', { symbol, limit });
    
    try {
      const apiKey = process.env.MARKETSTACK_API_KEY;
      if (!apiKey) {
        throw new Error('Marketstack API key not configured');
      }

      // First, get stock information
      const infoParams = new URLSearchParams({
        access_key: apiKey,
        search: symbol,
        limit: '1',
      });

      const infoResponse = await fetch(`http://api.marketstack.com/v1/tickers?${infoParams}`);
      
      if (!infoResponse.ok) {
        throw new Error(`Marketstack API error: ${infoResponse.status} ${infoResponse.statusText}`);
      }

      const infoData = await infoResponse.json();
      
      if (!infoData.data || infoData.data.length === 0) {
        return {
          success: false,
          message: `Stock symbol "${symbol}" not found.`,
          symbol,
          data: [],
          stockInfo: null,
        };
      }

      const stockInfo = infoData.data[0];

      // Then, get stock price data
      const dataParams = new URLSearchParams({
        access_key: apiKey,
        symbols: symbol,
        limit: limit.toString(),
        sort: 'DESC',
      });

      const dataResponse = await fetch(`http://api.marketstack.com/v1/eod?${dataParams}`);
      
      if (!dataResponse.ok) {
        throw new Error(`Marketstack API error: ${dataResponse.status} ${dataResponse.statusText}`);
      }

      const stockData = await dataResponse.json();

      if (!stockData.data || stockData.data.length === 0) {
        return {
          success: true,
          message: `No recent data available for ${symbol}`,
          symbol,
          data: [],
          stockInfo: {
            name: stockInfo.name,
            exchange: stockInfo.exchange,
            currency: stockInfo.currency,
            country: stockInfo.country,
          },
        };
      }

      const latestData = stockData.data[0] as Record<string, unknown>;
      const previousData = stockData.data[1] as Record<string, unknown>;
      
      const latestClose = Number(latestData.close) || 0;
      const previousClose = Number(previousData?.close) || Number(latestData.open) || 0;
      const priceChange = latestClose - previousClose;
      const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;

      const formattedData = stockData.data.slice(0, 10).map((item: Record<string, unknown>) => {
        const open = Number(item.open) || 0;
        const close = Number(item.close) || 0;
        return {
          date: item.date,
          open,
          high: Number(item.high) || 0,
          low: Number(item.low) || 0,
          close,
          volume: Number(item.volume) || 0,
          change: close - open,
          changePercent: open > 0 ? ((close - open) / open) * 100 : 0,
        };
      });

      return {
        success: true,
        message: `Retrieved stock data for ${symbol}`,
        symbol,
        stockInfo: {
          name: stockInfo.name,
          exchange: stockInfo.exchange,
          currency: stockInfo.currency,
          country: stockInfo.country,
        },
        currentPrice: latestClose,
        priceChange,
        priceChangePercent,
        high: Number(latestData.high) || 0,
        low: Number(latestData.low) || 0,
        volume: Number(latestData.volume) || 0,
        data: formattedData,
        totalDataPoints: stockData.pagination.total,
      };
    } catch (error) {
      console.error('Stock data error:', error);
      
      let errorMessage = 'Failed to get stock data';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Marketstack API key is invalid or missing. Please configure your API key in settings.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access forbidden. Please check your Marketstack API key permissions.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Stock data failed: ${error.message}`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        symbol,
        data: [],
        stockInfo: null,
      };
    }
  },
  {
    name: 'searchStockData',
    description: 'Get real-time and historical stock market data for companies. Use this to check stock prices, trading volumes, and market performance.',
    schema: z.object({
      symbol: z.string().describe('Stock symbol or ticker (e.g., "AAPL", "TSLA", "GOOGL", "MSFT")'),
      limit: z.number().optional().describe('Number of data points to return (default: 30, max: 1000)')
    }),
  }
);

// Stock symbols tool
export const searchStockSymbolsTool = tool(
  async (input) => {
    const { query, limit = 10 } = input as { query: string; limit?: number };
    console.log('🔧 [TOOL DEBUG] searchStockSymbolsTool called with:', { query, limit });
    
    try {
      const apiKey = process.env.MARKETSTACK_API_KEY;
      if (!apiKey) {
        throw new Error('Marketstack API key not configured');
      }

      const params = new URLSearchParams({
        access_key: apiKey,
        search: query,
        limit: limit.toString(),
      });

      const response = await fetch(`http://api.marketstack.com/v1/tickers?${params}`);
      
      if (!response.ok) {
        throw new Error(`Marketstack API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        return {
          success: true,
          message: `No companies found for "${query}"`,
          results: [],
        };
      }

      const results = data.data.map((company: Record<string, unknown>) => ({
        symbol: company.symbol,
        name: company.name,
        exchange: company.exchange,
        currency: company.currency,
        country: company.country,
        type: company.type,
      }));

      return {
        success: true,
        message: `Found ${results.length} companies matching "${query}"`,
        results,
      };
    } catch (error) {
      console.error('Stock search error:', error);
      
      let errorMessage = 'Failed to search stocks';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Marketstack API key is invalid or missing. Please configure your API key in settings.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Access forbidden. Please check your Marketstack API key permissions.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = `Stock search failed: ${error.message}`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        results: [],
      };
    }
  },
  {
    name: 'searchStockSymbols',
    description: 'Search for stock symbols and company information. Use this to find the correct ticker symbol for a company.',
    schema: z.object({
      query: z.string().describe('Company name or partial symbol to search for (e.g., "Apple", "Microsoft", "Tesla")'),
      limit: z.number().optional().describe('Number of results to return (default: 10, max: 100)')
    }),
  }
);

export const allTools = [searchNewsTool, searchStockDataTool, searchStockSymbolsTool];