# LangSmith Integration Guide

This document explains how to use LangSmith for tracing and evaluation in the Financial Adviser AI project.

## Overview

LangSmith is integrated into this project to provide:
- **Tracing**: Track LLM calls, tool usage, and agent runs
- **Evaluation**: Automated testing and scoring of AI responses
- **Monitoring**: Performance metrics and error tracking
- **Feedback**: Human feedback collection and analysis

## Setup

### 1. Get LangSmith API Key

1. Sign up at [LangSmith](https://smith.langchain.com/)
2. Create a new project or use the default
3. Get your API key from the settings

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# LangSmith Configuration
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=financial-adviser-ai
LANGSMITH_ENVIRONMENT=development
LANGSMITH_TRACING=true
```

### 3. Install Dependencies

The LangSmith SDK is already included in the project:

```bash
pnpm install  # LangSmith is already in package.json
```

## Features

### Automatic Tracing

The integration automatically traces:

- **LLM Calls**: All model interactions with inputs, outputs, and metadata
- **Tool Usage**: Financial data tools (news, stock data, etc.)
- **Agent Runs**: Complete conversation flows
- **Errors**: Failed calls and error messages

### Evaluation Framework

The evaluation system includes:

- **Multiple Datasets**: Basic questions, advanced analysis, tool usage tests, edge cases
- **Automated Scoring**: Relevance, accuracy, tool usage, completeness
- **Feedback Generation**: Strengths, weaknesses, and improvement suggestions
- **Batch Processing**: Run evaluations on multiple examples

## Usage

### Running Evaluations

#### Using the CLI Script

```bash
# List available datasets
pnpm tsx scripts/run-evaluation.ts --list-datasets

# Run evaluation on basic questions
pnpm tsx scripts/run-evaluation.ts --dataset basic --create-dataset --run-evaluation

# Run evaluation on first 10 examples from all datasets
pnpm tsx scripts/run-evaluation.ts --dataset all --run-evaluation --max-examples 10

# Save results to file
pnpm tsx scripts/run-evaluation.ts --dataset tool-usage --run-evaluation --output results.json
```

#### Using the API Endpoint

```bash
# Get dataset information
curl http://localhost:3001/api/evaluation?dataset=basic

# Run evaluation via API
curl -X POST http://localhost:3001/api/evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": "basic",
    "createDataset": true,
    "runEvaluation": true,
    "maxExamples": 5
  }'
```

### Available Datasets

1. **Basic Financial Questions** (`basic`)
   - Simple stock advice and market overview questions
   - 5 examples, easy difficulty

2. **Advanced Financial Analysis** (`advanced`)
   - Complex portfolio management and economic analysis
   - 3 examples, hard difficulty

3. **Tool Usage Tests** (`tool-usage`)
   - Tests for proper tool usage in different scenarios
   - 3 examples, easy to medium difficulty

4. **Edge Cases** (`edge-cases`)
   - Error handling and ambiguous questions
   - 3 examples, medium difficulty

5. **Complete Suite** (`all`)
   - All evaluation examples combined
   - 14 examples total

### Evaluation Metrics

The system evaluates responses on:

- **Relevance** (0-1): How well the response addresses the user's question
- **Accuracy** (0-1): Quality and correctness of financial advice
- **Tool Usage** (0-1): Appropriate use of financial data tools
- **Completeness** (0-1): Thoroughness and detail of the response
- **Overall** (0-1): Weighted average of all metrics

## Viewing Results

### LangSmith Dashboard

1. Go to [LangSmith Dashboard](https://smith.langchain.com/)
2. Select your project: `financial-adviser-ai`
3. View traces, runs, and evaluation results
4. Analyze performance metrics and feedback

### Key Views

- **Traces**: Individual LLM calls and tool executions
- **Runs**: Complete agent conversations
- **Datasets**: Evaluation datasets and examples
- **Feedback**: Human and automated feedback scores

## Integration Details

### Tracing Architecture

```typescript
// Automatic tracing in LLM calls
const response = await LangSmithTracer.traceLLMCall(
  modelConfig,
  messages,
  () => llmProvider.generateTextWithTools(modelConfig, messages),
  temperature,
  maxTokens
);

// Tool execution tracing
const result = await LangSmithTracer.traceToolCall(
  toolName,
  toolArgs,
  () => tool.invoke(toolArgs)
);

// Agent run tracing
const response = await LangSmithTracer.traceAgentRun(
  sessionId,
  userMessage,
  () => agent.processMessage(request)
);
```

### Service Configuration

The `LangSmithService` singleton manages:
- Client initialization
- Configuration loading
- Run creation and updates
- Feedback collection

### Evaluation Process

1. **Dataset Creation**: Examples are uploaded to LangSmith
2. **Example Processing**: Each example is run through the agent
3. **Response Evaluation**: Automated scoring based on multiple criteria
4. **Feedback Collection**: Results are stored in LangSmith
5. **Report Generation**: Summary statistics and recommendations

## Best Practices

### For Development

1. **Use Development Environment**: Set `LANGSMITH_ENVIRONMENT=development`
2. **Monitor Traces**: Check LangSmith dashboard regularly for errors
3. **Run Evaluations**: Test changes with evaluation datasets
4. **Review Feedback**: Analyze evaluation results to improve responses

### For Production

1. **Set Production Environment**: Use `LANGSMITH_ENVIRONMENT=production`
2. **Monitor Performance**: Track response times and error rates
3. **Collect Feedback**: Enable human feedback collection
4. **Regular Evaluations**: Run evaluations after model updates

### For Evaluation

1. **Start Small**: Begin with basic datasets before advanced ones
2. **Iterate**: Use evaluation results to improve prompts and logic
3. **Document Changes**: Track how changes affect evaluation scores
4. **Compare Models**: Evaluate different LLM providers and models

## Troubleshooting

### Common Issues

1. **LangSmith Not Enabled**
   ```
   Error: LangSmith is not enabled
   ```
   - Check `LANGSMITH_API_KEY` is set
   - Verify API key is valid

2. **Dataset Creation Failed**
   ```
   Error: Failed to create evaluation dataset
   ```
   - Check API key permissions
   - Verify project name is correct

3. **Evaluation Timeout**
   ```
   Error: Evaluation took too long
   ```
   - Reduce `maxExamples` parameter
   - Check network connectivity

### Debug Mode

Enable debug logging:

```bash
DEBUG=langsmith:* pnpm tsx scripts/run-evaluation.ts --dataset basic --run-evaluation
```

## API Reference

### LangSmithService

```typescript
// Check if tracing is enabled
langsmithService.isEnabled(): boolean

// Create a new run
langsmithService.createRun(name, inputs, runType): Promise<Run | null>

// Update run with outputs or errors
langsmithService.updateRun(runId, updates): Promise<void>

// Add feedback to a run
langsmithService.createFeedback(runId, feedback): Promise<void>
```

### LangSmithEvaluator

```typescript
// Create evaluation dataset
evaluator.createEvaluationDataset(name, description, examples): Promise<string | null>

// Evaluate single example
evaluator.evaluateExample(example, runId?): Promise<EvaluationResult>

// Run batch evaluation
evaluator.runBatchEvaluation(examples, datasetName?): Promise<EvaluationResult[]>
```

## Examples

### Custom Evaluation Dataset

```typescript
import { LangSmithEvaluator } from '@/lib/evaluation/langsmith-evaluator';

const evaluator = new LangSmithEvaluator();

const customExamples = [
  {
    id: 'custom-1',
    input: {
      messages: [{ role: 'user', content: 'What is the best investment strategy?' }],
      model: 'groq/llama-3.1-70b-versatile',
    },
    expectedOutput: {
      content: 'Should provide comprehensive investment strategy advice',
      shouldUseTools: false,
    },
    metadata: {
      category: 'investment-strategy',
      difficulty: 'medium',
      description: 'Custom investment strategy question',
    },
  },
];

// Create dataset
const datasetId = await evaluator.createEvaluationDataset(
  'Custom Investment Questions',
  'Custom evaluation dataset for investment strategies',
  customExamples
);

// Run evaluation
const results = await evaluator.runBatchEvaluation(customExamples);
```

### Adding Custom Feedback

```typescript
import { LangSmithTracer } from '@/lib/agent/langsmith-tracer';

// Add feedback to a specific run
await LangSmithTracer.addFeedback(runId, {
  key: 'user_satisfaction',
  score: 0.8,
  value: 'good',
  comment: 'User found the response helpful and accurate',
});
```

## Contributing

When adding new features:

1. **Add Tracing**: Ensure new LLM calls are traced
2. **Create Tests**: Add evaluation examples for new functionality
3. **Update Documentation**: Document new features and APIs
4. **Run Evaluations**: Test changes with evaluation datasets

## Support

For issues with LangSmith integration:

1. Check the [LangSmith Documentation](https://docs.smith.langchain.com/)
2. Review the evaluation results in the LangSmith dashboard
3. Check the application logs for error messages
4. Verify environment variables are correctly set
