import { NextResponse } from 'next/server';
import { MODEL_CONFIGS } from '@/lib/agent/models';

export async function GET() {
  try {
    // Simple, stable status check without complex API calls
    const models = MODEL_CONFIGS.map(model => {
      const apiKey = process.env[`${model.provider.toUpperCase()}_API_KEY`];
      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        configured: !!apiKey,
        error: apiKey ? undefined : `Missing ${model.provider.toUpperCase()}_API_KEY environment variable`
      };
    });

    const hasAnyConfigured = models.some(model => model.configured);
    const errors = models
      .filter(model => !model.configured)
      .map(model => ({
        type: 'missing_key',
        message: model.error || 'API key not configured',
        model: model.id,
        provider: model.provider,
        timestamp: new Date().toISOString()
      }));

    return NextResponse.json({
      models,
      hasAnyConfigured,
      errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking model status:', error);
    
    // Return a safe fallback response
    return NextResponse.json({
      models: MODEL_CONFIGS.map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        configured: false,
        error: 'Status check failed'
      })),
      hasAnyConfigured: false,
      errors: [
        {
          type: 'system_error',
          message: 'Failed to check model status',
          timestamp: new Date().toISOString()
        }
      ],
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Return 200 even on error to prevent UI issues
  }
}
