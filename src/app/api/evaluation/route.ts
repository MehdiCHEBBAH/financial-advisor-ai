import { NextRequest, NextResponse } from 'next/server';
import { LangSmithEvaluator, EvaluationResult } from '@/lib/evaluation/langsmith-evaluator';
import { evaluationDatasets } from '@/lib/evaluation/datasets';
import { langsmithService } from '@/lib/services';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dataset = 'basic', 
      createDataset = false, 
      runEvaluation = true,
      maxExamples 
    } = body;

    // Check if LangSmith is enabled
    if (!langsmithService.isEnabled()) {
      return NextResponse.json(
        {
          error: 'LangSmith is not enabled. Please configure LANGSMITH_API_KEY environment variable.',
          success: false,
        },
        { status: 400 }
      );
    }

    // Get the requested dataset
    const datasetConfig = evaluationDatasets[dataset as keyof typeof evaluationDatasets];
    if (!datasetConfig) {
      return NextResponse.json(
        {
          error: `Dataset '${dataset}' not found. Available datasets: ${Object.keys(evaluationDatasets).join(', ')}`,
          success: false,
        },
        { status: 400 }
      );
    }

    let examples = datasetConfig.examples;
    if (maxExamples && maxExamples > 0) {
      examples = examples.slice(0, maxExamples);
    }

    const evaluator = new LangSmithEvaluator();
    let datasetId: string | null = null;

    // Create dataset in LangSmith if requested
    if (createDataset) {
      console.log(`📊 Creating dataset: ${datasetConfig.name}`);
      datasetId = await evaluator.createEvaluationDataset(
        datasetConfig.name,
        datasetConfig.description,
        examples
      );
      
      if (!datasetId) {
        return NextResponse.json(
          {
            error: 'Failed to create evaluation dataset in LangSmith',
            success: false,
          },
          { status: 500 }
        );
      }
    }

    let results: EvaluationResult[] = [];

    // Run evaluation if requested
    if (runEvaluation) {
      console.log(`🚀 Running evaluation on ${examples.length} examples...`);
      results = await evaluator.runBatchEvaluation(examples);
    }

    return NextResponse.json({
      success: true,
      dataset: {
        name: datasetConfig.name,
        description: datasetConfig.description,
        exampleCount: examples.length,
        datasetId,
      },
      evaluation: {
        results,
        summary: results.length > 0 ? {
          totalExamples: results.length,
          averageScores: {
            relevance: results.reduce((sum, r) => sum + r.scores.relevance, 0) / results.length,
            accuracy: results.reduce((sum, r) => sum + r.scores.accuracy, 0) / results.length,
            toolUsage: results.reduce((sum, r) => sum + r.scores.toolUsage, 0) / results.length,
            completeness: results.reduce((sum, r) => sum + r.scores.completeness, 0) / results.length,
            overall: results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length,
          },
        } : null,
      },
    });

  } catch (error) {
    console.error('Evaluation API error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataset = searchParams.get('dataset') || 'all';

    // Get the requested dataset
    const datasetConfig = evaluationDatasets[dataset as keyof typeof evaluationDatasets];
    if (!datasetConfig) {
      return NextResponse.json(
        {
          error: `Dataset '${dataset}' not found. Available datasets: ${Object.keys(evaluationDatasets).join(', ')}`,
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset: {
        name: datasetConfig.name,
        description: datasetConfig.description,
        exampleCount: datasetConfig.examples.length,
        examples: datasetConfig.examples.map(ex => ({
          id: ex.id,
          input: ex.input,
          expectedOutput: ex.expectedOutput,
          metadata: ex.metadata,
        })),
      },
      availableDatasets: Object.keys(evaluationDatasets).map(key => ({
        key,
        name: evaluationDatasets[key as keyof typeof evaluationDatasets].name,
        description: evaluationDatasets[key as keyof typeof evaluationDatasets].description,
        exampleCount: evaluationDatasets[key as keyof typeof evaluationDatasets].examples.length,
      })),
    });

  } catch (error) {
    console.error('Evaluation API error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 }
    );
  }
}
