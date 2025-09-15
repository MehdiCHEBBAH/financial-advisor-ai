import { langsmithService } from '@/lib/services';
import { ModelConfig, AgentResponse, ToolCall } from './types';

interface LangSmithRun {
  id: string;
}

export interface TracedLLMCall {
  runId: string;
  model: string;
  provider: string;
  startTime: Date;
  endTime?: Date;
  inputs: {
    messages: Array<{ role: string; content: string }>;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  outputs?: {
    content: string;
    thinking?: string;
    toolCalls?: ToolCall[];
  };
  error?: string;
  metadata: {
    environment: string;
    project: string;
    timestamp: string;
  };
}

export class LangSmithTracer {
  private static async createLLMRun(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature?: number,
    maxTokens?: number
  ): Promise<string | null> {
    if (!langsmithService.isEnabled()) {
      return null;
    }

    const run = await langsmithService.createRun(
      `llm-call-${modelConfig.provider}-${modelConfig.model}`,
      {
        messages,
        model: modelConfig.id,
        provider: modelConfig.provider,
        temperature,
        maxTokens,
        timestamp: new Date().toISOString(),
      },
      'llm'
    );

    return run ? (run as LangSmithRun).id : null;
  }

  private static async updateLLMRun(
    runId: string,
    response: AgentResponse,
    error?: string
  ): Promise<void> {
    if (!langsmithService.isEnabled()) {
      return;
    }

    const updates: {
      outputs?: Record<string, unknown>;
      error?: string;
      endTime?: Date;
      extra?: Record<string, unknown>;
    } = {
      endTime: new Date(),
    };

    if (error) {
      updates.error = error;
    } else {
      updates.outputs = {
        content: response.content,
        thinking: response.thinking,
        toolCalls: response.toolCalls,
        model: response.model,
      };
    }

    await langsmithService.updateRun(runId, updates);
  }

  public static async traceLLMCall<T>(
    modelConfig: ModelConfig,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    llmCall: () => Promise<T>,
    temperature?: number,
    maxTokens?: number
  ): Promise<T> {
    const runId = await this.createLLMRun(modelConfig, messages, temperature, maxTokens);

    try {
      const result = await llmCall();
      
      if (runId && typeof result === 'object' && result !== null && 'content' in result) {
        await this.updateLLMRun(runId, result as unknown as AgentResponse);
      }

      return result;
    } catch (error) {
      if (runId) {
        await this.updateLLMRun(
          runId,
          { content: '', model: modelConfig.id } as unknown as AgentResponse,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  }

  public static async traceToolCall(
    toolName: string,
    toolArgs: Record<string, unknown>,
    toolCall: () => Promise<unknown>
  ): Promise<unknown> {
    if (!langsmithService.isEnabled()) {
      return toolCall();
    }

    const run = await langsmithService.createRun(
      `tool-call-${toolName}`,
      {
        toolName,
        toolArgs,
        timestamp: new Date().toISOString(),
      },
      'tool'
    );

    try {
      const result = await toolCall();
      
      if (run) {
        await langsmithService.updateRun(run ? (run as LangSmithRun).id : '', {
          outputs: { result },
          endTime: new Date(),
        });
      }

      return result;
    } catch (error) {
      if (run) {
        await langsmithService.updateRun(run ? (run as LangSmithRun).id : '', {
          error: error instanceof Error ? error.message : 'Unknown error',
          endTime: new Date(),
        });
      }
      throw error;
    }
  }

  public static async traceAgentRun(
    sessionId: string,
    userMessage: string,
    agentCall: () => Promise<AgentResponse>
  ): Promise<AgentResponse> {
    if (!langsmithService.isEnabled()) {
      return agentCall();
    }

    const run = await langsmithService.createRun(
      `agent-run-${sessionId}`,
      {
        sessionId,
        userMessage,
        timestamp: new Date().toISOString(),
      },
      'chain'
    );

    try {
      const result = await agentCall();
      
      if (run) {
        await langsmithService.updateRun(run ? (run as LangSmithRun).id : '', {
          outputs: {
            content: result.content,
            thinking: result.thinking,
            toolCalls: result.toolCalls,
            model: result.model,
          },
          endTime: new Date(),
        });
      }

      return result;
    } catch (error) {
      if (run) {
        await langsmithService.updateRun(run ? (run as LangSmithRun).id : '', {
          error: error instanceof Error ? error.message : 'Unknown error',
          endTime: new Date(),
        });
      }
      throw error;
    }
  }

  public static async addFeedback(
    runId: string,
    feedback: {
      key: string;
      score?: number;
      value?: string | number | boolean;
      comment?: string;
    }
  ): Promise<void> {
    if (!langsmithService.isEnabled()) {
      return;
    }

    await langsmithService.createFeedback(runId, feedback);
  }
}
