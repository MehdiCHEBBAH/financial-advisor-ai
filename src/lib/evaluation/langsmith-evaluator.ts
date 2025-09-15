import { langsmithService } from '@/lib/services';
import { FinancialAgent } from '@/lib/agent';
import { validateModel } from '@/lib/agent/models';
import { AgentMessage } from '@/lib/agent/types';

export interface EvaluationExample {
  id: string;
  input: {
    messages: AgentMessage[];
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  expectedOutput?: {
    content: string;
    shouldUseTools?: boolean;
    expectedToolCalls?: string[];
  };
  metadata?: {
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
  };
}

export interface EvaluationResult {
  exampleId: string;
  runId?: string;
  actualOutput: {
    content: string;
    thinking?: string;
    toolCalls?: Array<{ name: string; args: Record<string, unknown>; success: boolean }>;
  };
  scores: {
    relevance: number; // 0-1, how relevant is the response to the question
    accuracy: number; // 0-1, how accurate is the financial information
    toolUsage: number; // 0-1, did it use tools appropriately
    completeness: number; // 0-1, how complete is the response
    overall: number; // 0-1, overall quality
  };
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  timestamp: string;
}

export class LangSmithEvaluator {
  private agent: FinancialAgent;

  constructor() {
    this.agent = new FinancialAgent();
  }

  public async createEvaluationDataset(
    name: string,
    description: string,
    examples: EvaluationExample[]
  ): Promise<string | null> {
    if (!langsmithService.isEnabled()) {
      console.warn('LangSmith is not enabled. Cannot create evaluation dataset.');
      return null;
    }

    try {
      const dataset = await langsmithService.createDataset(name, description);
      if (!dataset) {
        throw new Error('Failed to create dataset');
      }

      // Add examples to the dataset
      for (const example of examples) {
        await langsmithService.createExample(
          dataset.id,
          {
            input: example.input,
            expectedOutput: example.expectedOutput,
            metadata: example.metadata,
          },
          example.expectedOutput
        );
      }

      console.log(`✅ Created evaluation dataset: ${name} with ${examples.length} examples`);
      return dataset.id;
    } catch (error) {
      console.error('❌ Failed to create evaluation dataset:', error);
      return null;
    }
  }

  public async evaluateExample(
    example: EvaluationExample,
    runId?: string
  ): Promise<EvaluationResult> {
    try {
      // Validate model
      if (!validateModel(example.input.model)) {
        throw new Error(`Invalid model: ${example.input.model}`);
      }

      // Process the example
      const response = await this.agent.processMessage({
        messages: example.input.messages,
        model: example.input.model,
        temperature: example.input.temperature,
        maxOutputTokens: example.input.maxTokens,
      });

      // Evaluate the response
      const scores = await this.evaluateResponse(example, response);
      const feedback = this.generateFeedback(example, response, scores);

      const result: EvaluationResult = {
        exampleId: example.id,
        runId,
        actualOutput: {
          content: response.content,
          thinking: response.thinking,
          toolCalls: response.toolCalls?.map(tc => ({
            name: tc.name,
            args: tc.args,
            success: tc.success !== false,
          })),
        },
        scores,
        feedback,
        timestamp: new Date().toISOString(),
      };

      // Add feedback to LangSmith if runId is provided
      if (runId && langsmithService.isEnabled()) {
        await langsmithService.createFeedback(runId, {
          key: 'overall_score',
          score: scores.overall,
          comment: `Overall score: ${scores.overall.toFixed(2)}/1.0`,
        });

        await langsmithService.createFeedback(runId, {
          key: 'relevance_score',
          score: scores.relevance,
          comment: `Relevance: ${scores.relevance.toFixed(2)}/1.0`,
        });

        await langsmithService.createFeedback(runId, {
          key: 'accuracy_score',
          score: scores.accuracy,
          comment: `Accuracy: ${scores.accuracy.toFixed(2)}/1.0`,
        });

        await langsmithService.createFeedback(runId, {
          key: 'tool_usage_score',
          score: scores.toolUsage,
          comment: `Tool Usage: ${scores.toolUsage.toFixed(2)}/1.0`,
        });

        await langsmithService.createFeedback(runId, {
          key: 'completeness_score',
          score: scores.completeness,
          comment: `Completeness: ${scores.completeness.toFixed(2)}/1.0`,
        });
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to evaluate example ${example.id}:`, error);
      throw error;
    }
  }

  private async evaluateResponse(
    example: EvaluationExample,
    response: { content: string; thinking?: string; toolCalls?: Array<{ name: string; args: Record<string, unknown>; success?: boolean }> }
  ): Promise<EvaluationResult['scores']> {
    const scores = {
      relevance: this.evaluateRelevance(example, response),
      accuracy: this.evaluateAccuracy(response),
      toolUsage: this.evaluateToolUsage(example, response),
      completeness: this.evaluateCompleteness(response),
      overall: 0.5,
    };

    // Calculate overall score
    scores.overall = (scores.relevance + scores.accuracy + scores.toolUsage + scores.completeness) / 4;

    // Ensure scores are between 0 and 1
    Object.keys(scores).forEach(key => {
      scores[key as keyof typeof scores] = Math.min(1, Math.max(0, scores[key as keyof typeof scores]));
    });

    return scores;
  }

  private evaluateRelevance(
    example: EvaluationExample,
    response: { content: string }
  ): number {
    const userMessage = example.input.messages.find(m => m.role === 'user')?.content.toLowerCase() || '';
    const responseContent = response.content.toLowerCase();
    
    let score = 0.5;
    
    if (userMessage.includes('stock') && responseContent.includes('stock')) {
      score += 0.2;
    }
    if (userMessage.includes('invest') && responseContent.includes('invest')) {
      score += 0.2;
    }
    if (userMessage.includes('market') && responseContent.includes('market')) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private evaluateAccuracy(response: { content: string }): number {
    let score = 0.5;

    if (response.content.includes('disclaimer') || response.content.includes('not financial advice')) {
      score += 0.2;
    }
    if (response.content.includes('diversification') || response.content.includes('risk')) {
      score += 0.2;
    }
    if (!response.content.includes('guarantee') && !response.content.includes('sure thing')) {
      score += 0.1; // Avoids making guarantees
    }

    return Math.min(1, score);
  }

  private evaluateToolUsage(
    example: EvaluationExample,
    response: { toolCalls?: Array<{ name: string; args: Record<string, unknown>; success?: boolean }> }
  ): number {
    if (response.toolCalls && response.toolCalls.length > 0) {
      if (example.expectedOutput?.shouldUseTools) {
        return 1.0; // Perfect tool usage
      }
      return 0.8; // Good tool usage
    }
    
    if (example.expectedOutput?.shouldUseTools) {
      return 0.2; // Should have used tools but didn't
    }
    
    return 0.7; // No tools needed, that's fine
  }

  private evaluateCompleteness(response: { content: string; thinking?: string }): number {
    let score = 0.5;

    if (response.content.length > 100) {
      score += 0.2;
    }
    if (response.content.length > 300) {
      score += 0.2;
    }
    if (response.thinking && response.thinking.length > 50) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private generateFeedback(
    example: EvaluationExample,
    response: { content: string; thinking?: string; toolCalls?: Array<{ name: string; args: Record<string, unknown>; success?: boolean }> },
    scores: EvaluationResult['scores']
  ): EvaluationResult['feedback'] {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // Analyze strengths
    if (scores.toolUsage > 0.7) {
      strengths.push('Good use of tools to gather current information');
    }
    if (scores.accuracy > 0.7) {
      strengths.push('Provides responsible financial advice with appropriate disclaimers');
    }
    if (scores.completeness > 0.7) {
      strengths.push('Comprehensive and detailed response');
    }
    if (response.thinking && response.thinking.length > 50) {
      strengths.push('Shows good reasoning process');
    }

    // Analyze weaknesses
    if (scores.relevance < 0.6) {
      weaknesses.push('Response may not be directly relevant to the user question');
    }
    if (scores.accuracy < 0.6) {
      weaknesses.push('Financial advice quality could be improved');
    }
    if (scores.toolUsage < 0.6) {
      weaknesses.push('Should use tools to gather current data before providing advice');
    }
    if (scores.completeness < 0.6) {
      weaknesses.push('Response could be more comprehensive');
    }

    // Generate suggestions
    if (scores.toolUsage < 0.7) {
      suggestions.push('Consider using financial data tools to provide more current information');
    }
    if (scores.accuracy < 0.7) {
      suggestions.push('Include more disclaimers and emphasize the educational nature of advice');
    }
    if (scores.completeness < 0.7) {
      suggestions.push('Provide more detailed explanations and context');
    }
    if (scores.relevance < 0.7) {
      suggestions.push('Ensure the response directly addresses the user\'s specific question');
    }

    return { strengths, weaknesses, suggestions };
  }

  public async runBatchEvaluation(
    examples: EvaluationExample[]
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    console.log(`🚀 Starting batch evaluation of ${examples.length} examples...`);

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      console.log(`📊 Evaluating example ${i + 1}/${examples.length}: ${example.id}`);

      try {
        const result = await this.evaluateExample(example);
        results.push(result);
        
        console.log(`✅ Example ${example.id} completed - Overall score: ${result.scores.overall.toFixed(2)}`);
      } catch (error) {
        console.error(`❌ Failed to evaluate example ${example.id}:`, error);
        // Continue with other examples
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🎉 Batch evaluation completed! Processed ${results.length}/${examples.length} examples`);
    
    // Log summary statistics
    if (results.length > 0) {
      const avgScores = {
        relevance: results.reduce((sum, r) => sum + r.scores.relevance, 0) / results.length,
        accuracy: results.reduce((sum, r) => sum + r.scores.accuracy, 0) / results.length,
        toolUsage: results.reduce((sum, r) => sum + r.scores.toolUsage, 0) / results.length,
        completeness: results.reduce((sum, r) => sum + r.scores.completeness, 0) / results.length,
        overall: results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length,
      };

      console.log('📈 Average Scores:');
      console.log(`  Relevance: ${avgScores.relevance.toFixed(2)}/1.0`);
      console.log(`  Accuracy: ${avgScores.accuracy.toFixed(2)}/1.0`);
      console.log(`  Tool Usage: ${avgScores.toolUsage.toFixed(2)}/1.0`);
      console.log(`  Completeness: ${avgScores.completeness.toFixed(2)}/1.0`);
      console.log(`  Overall: ${avgScores.overall.toFixed(2)}/1.0`);
    }

    return results;
  }
}
