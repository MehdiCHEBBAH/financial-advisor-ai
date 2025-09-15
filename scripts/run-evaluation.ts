#!/usr/bin/env tsx

// Load environment variables from .env file FIRST, before any other imports
import './load-env';

/**
 * LangSmith Evaluation Runner
 * 
 * This script runs evaluations on the financial adviser AI using LangSmith.
 * It can create datasets, run evaluations, and generate reports.
 * 
 * Usage:
 *   pnpm tsx scripts/run-evaluation.ts --dataset basic --create-dataset --run-evaluation
 *   pnpm tsx scripts/run-evaluation.ts --dataset all --max-examples 10
 *   pnpm tsx scripts/run-evaluation.ts --list-datasets
 */

import { LangSmithEvaluator } from '../src/lib/evaluation/langsmith-evaluator';
import { evaluationDatasets } from '../src/lib/evaluation/datasets';
import { langsmithService } from '../src/lib/services';

interface EvaluationOptions {
  dataset: string;
  createDataset: boolean;
  runEvaluation: boolean;
  maxExamples?: number;
  listDatasets: boolean;
  outputFile?: string;
}

function parseArgs(): EvaluationOptions {
  const args = process.argv.slice(2);
  const options: EvaluationOptions = {
    dataset: 'basic',
    createDataset: false,
    runEvaluation: false,
    listDatasets: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dataset':
        options.dataset = args[++i] || 'basic';
        break;
      case '--create-dataset':
        options.createDataset = true;
        break;
      case '--run-evaluation':
        options.runEvaluation = true;
        break;
      case '--max-examples':
        options.maxExamples = parseInt(args[++i] || '0', 10);
        break;
      case '--list-datasets':
        options.listDatasets = true;
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
LangSmith Evaluation Runner

Usage: pnpm tsx scripts/run-evaluation.ts [options]

Options:
  --dataset <name>        Dataset to use (default: basic)
  --create-dataset        Create dataset in LangSmith
  --run-evaluation        Run evaluation on examples
  --max-examples <num>    Limit number of examples to evaluate
  --list-datasets         List available datasets
  --output <file>         Save results to file (JSON format)
  --help                  Show this help message

Available datasets:
${Object.keys(evaluationDatasets).map(key => {
  const config = evaluationDatasets[key as keyof typeof evaluationDatasets];
  return `  ${key.padEnd(12)} - ${config.name} (${config.examples.length} examples)`;
}).join('\n')}

Examples:
  # List all available datasets
  pnpm tsx scripts/run-evaluation.ts --list-datasets

  # Create dataset and run evaluation on basic questions
  pnpm tsx scripts/run-evaluation.ts --dataset basic --create-dataset --run-evaluation

  # Run evaluation on first 5 examples from all datasets
  pnpm tsx scripts/run-evaluation.ts --dataset all --run-evaluation --max-examples 5

  # Create dataset only (no evaluation)
  pnpm tsx scripts/run-evaluation.ts --dataset tool-usage --create-dataset
`);
}

function listDatasets() {
  console.log('\n📊 Available Evaluation Datasets:\n');
  
  Object.entries(evaluationDatasets).forEach(([key, config]) => {
    console.log(`🔹 ${key}`);
    console.log(`   Name: ${config.name}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Examples: ${config.examples.length}`);
    console.log(`   Categories: ${[...new Set(config.examples.map(ex => ex.metadata?.category))].join(', ')}`);
    console.log(`   Difficulties: ${[...new Set(config.examples.map(ex => ex.metadata?.difficulty))].join(', ')}`);
    console.log('');
  });
}

async function runEvaluation(options: EvaluationOptions) {
  console.log('🚀 Starting LangSmith Evaluation...\n');

  // Check if LangSmith is enabled
  if (!langsmithService.isEnabled()) {
    console.error('❌ LangSmith is not enabled!');
    console.error('Please set the LANGSMITH_API_KEY environment variable.');
    console.error('You can get your API key from: https://smith.langchain.com/');
    process.exit(1);
  }

  console.log('✅ LangSmith is enabled');
  console.log(`📊 Project: ${langsmithService.getProjectName()}`);
  console.log(`🌍 Environment: ${langsmithService.getEnvironment()}\n`);

  // Get the requested dataset
  const datasetConfig = evaluationDatasets[options.dataset as keyof typeof evaluationDatasets];
  if (!datasetConfig) {
    console.error(`❌ Dataset '${options.dataset}' not found!`);
    console.error(`Available datasets: ${Object.keys(evaluationDatasets).join(', ')}`);
    process.exit(1);
  }

  let examples = datasetConfig.examples;
  if (options.maxExamples && options.maxExamples > 0) {
    examples = examples.slice(0, options.maxExamples);
  }

  console.log(`📋 Using dataset: ${datasetConfig.name}`);
  console.log(`📝 Description: ${datasetConfig.description}`);
  console.log(`🔢 Examples: ${examples.length} (${datasetConfig.examples.length} total)\n`);

  const evaluator = new LangSmithEvaluator();
  let datasetId: string | null = null;

  // Create dataset in LangSmith if requested
  if (options.createDataset) {
    console.log('📊 Creating dataset in LangSmith...');
    datasetId = await evaluator.createEvaluationDataset(
      datasetConfig.name,
      datasetConfig.description,
      examples
    );
    
    if (datasetId) {
      console.log(`✅ Dataset created successfully! ID: ${datasetId}\n`);
    } else {
      console.error('❌ Failed to create dataset in LangSmith\n');
      process.exit(1);
    }
  }

  // Run evaluation if requested
  if (options.runEvaluation) {
    console.log(`🚀 Running evaluation on ${examples.length} examples...\n`);
    
    const startTime = Date.now();
    const results = await evaluator.runBatchEvaluation(examples);
    const endTime = Date.now();
    
    console.log(`\n🎉 Evaluation completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds!`);
    
    // Print summary
    if (results.length > 0) {
      const avgScores = {
        relevance: results.reduce((sum, r) => sum + r.scores.relevance, 0) / results.length,
        accuracy: results.reduce((sum, r) => sum + r.scores.accuracy, 0) / results.length,
        toolUsage: results.reduce((sum, r) => sum + r.scores.toolUsage, 0) / results.length,
        completeness: results.reduce((sum, r) => sum + r.scores.completeness, 0) / results.length,
        overall: results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length,
      };

      console.log('\n📈 Evaluation Summary:');
      console.log(`  Total Examples: ${results.length}`);
      console.log(`  Average Relevance: ${avgScores.relevance.toFixed(3)}/1.0`);
      console.log(`  Average Accuracy: ${avgScores.accuracy.toFixed(3)}/1.0`);
      console.log(`  Average Tool Usage: ${avgScores.toolUsage.toFixed(3)}/1.0`);
      console.log(`  Average Completeness: ${avgScores.completeness.toFixed(3)}/1.0`);
      console.log(`  Average Overall: ${avgScores.overall.toFixed(3)}/1.0`);

      // Show best and worst examples
      const sortedResults = results.sort((a, b) => b.scores.overall - a.scores.overall);
      console.log('\n🏆 Best Examples:');
      sortedResults.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.exampleId} - Score: ${result.scores.overall.toFixed(3)}`);
      });

      console.log('\n⚠️  Examples Needing Improvement:');
      sortedResults.slice(-3).reverse().forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.exampleId} - Score: ${result.scores.overall.toFixed(3)}`);
        if (result.feedback.weaknesses.length > 0) {
          console.log(`     Weaknesses: ${result.feedback.weaknesses.join(', ')}`);
        }
      });

      // Save results to file if requested
      if (options.outputFile) {
        const fs = await import('fs/promises');
        const outputData = {
          dataset: {
            name: datasetConfig.name,
            description: datasetConfig.description,
            exampleCount: examples.length,
            datasetId,
          },
          evaluation: {
            results,
            summary: {
              totalExamples: results.length,
              averageScores: avgScores,
              duration: endTime - startTime,
            },
          },
          timestamp: new Date().toISOString(),
        };

        await fs.writeFile(options.outputFile, JSON.stringify(outputData, null, 2));
        console.log(`\n💾 Results saved to: ${options.outputFile}`);
      }
    }
  }

  console.log('\n✅ Evaluation process completed!');
}

async function main() {
  const options = parseArgs();

  if (options.listDatasets) {
    listDatasets();
    return;
  }

  await runEvaluation(options);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Evaluation failed:', error);
  process.exit(1);
});
