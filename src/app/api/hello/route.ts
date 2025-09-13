import { NextRequest, NextResponse } from 'next/server';

export interface HelloResponse {
  message: string;
  timestamp: string;
  userAgent?: string;
}

export interface HelloRequest {
  name?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<HelloResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || 'World';

    const response: HelloResponse = {
      message: `Hello, ${name}! Welcome to Financial Adviser AI.`,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Hello API error:', error);
    
    const errorResponse: HelloResponse = {
      message: 'An error occurred while processing your request',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<HelloResponse>> {
  try {
    const body: HelloRequest = await request.json();
    const name = body.name || 'World';

    const response: HelloResponse = {
      message: `Hello, ${name}! Welcome to Financial Adviser AI.`,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Hello POST API error:', error);
    
    const errorResponse: HelloResponse = {
      message: 'Invalid request body or processing error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }
}
