import { NextResponse } from 'next/server';
import { APIKeyService } from '@/lib/services';

export async function GET() {
  try {
    const status = await APIKeyService.checkModelConfigurationStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking model status:', error);
    return NextResponse.json(
      {
        models: [],
        hasAnyConfigured: false,
        errors: [
          {
            type: 'unknown',
            message: 'Failed to check model status',
          },
        ],
      },
      { status: 500 }
    );
  }
}
