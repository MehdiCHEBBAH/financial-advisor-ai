import { NextResponse } from 'next/server';
import { MODEL_CONFIGS } from '@/lib/agent';

export async function GET() {
  try {
    return NextResponse.json({
      models: MODEL_CONFIGS.map((config) => ({
        id: config.id,
        name: config.name,
        provider: config.provider,
        model: config.model,
        description: config.description,
        capabilities: config.capabilities,
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      })),
    });
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
