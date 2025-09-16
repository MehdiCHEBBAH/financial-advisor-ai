import { NextRequest, NextResponse } from 'next/server';
import { langsmithService } from '@/lib/services';

interface FeedbackBody {
  runId?: string;
  reaction: 'like' | 'dislike';
  comment?: string;
  context?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackBody;
    const { runId, reaction, comment, context } = body;

    if (!reaction || (reaction !== 'like' && reaction !== 'dislike')) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: reaction is required' },
        { status: 400 }
      );
    }

    if (!langsmithService.isEnabled()) {
      return NextResponse.json(
        { success: false, error: 'LangSmith not enabled' },
        { status: 400 }
      );
    }

    // If runId is missing, acknowledge the request but skip attaching to a run
    if (runId) {
      await langsmithService.createFeedback(runId, {
        key: 'user_reaction',
        value: reaction,
        comment,
      });
  
      if (context) {
        await langsmithService.createFeedback(runId, {
          key: 'user_reaction_context',
          value: JSON.stringify(context),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


