# Evaluation Guide

This document explains how we measure the quality of the Financial Adviser AI, the datasets we use, and how to run and extend evaluations.

## Goals
- Ensure responses are relevant, responsible, and data-informed
- Track regressions and improvements over time
- Compare models/providers and configuration changes safely

## Datasets
We maintain curated datasets in `src/lib/evaluation/datasets.ts`:
- Basic: Common advice and market overview
- Advanced: Deeper financial reasoning and multi-faceted analysis
- Tool Usage: Prompts that should trigger live-data lookups
- Edge Cases: Invalid tickers, ambiguous queries, no-tool-needed questions
- All: Combined suite for broad coverage

You can view and extend examples by editing `datasets.ts`. Each example defines inputs, expected behaviors (e.g., should use tools), and metadata.

## Metrics (0–1)
Calculated in `src/lib/evaluation/langsmith-evaluator.ts`:
- Relevance: Does the response address the user’s specific question?
- Accuracy: Responsible framing (disclaimers, risk, avoids guarantees) and sound financial principles
- Tool Usage: Appropriate use of live tools when expected; avoids unnecessary calls
- Completeness: Sufficient depth, structure, and context; explains trade-offs
- Overall: Simple average of the above for quick comparisons

These are heuristic, fast metrics that provide directional guidance and are simple to iterate on.

## Methodology
1. Validate the target model and run the agent on each example
2. Collect output, thinking trace (if available), and tool calls
3. Score with the heuristics above and generate feedback (strengths/weaknesses/suggestions)
4. Optionally create and populate a LangSmith dataset and attach feedback to runs

The `LangSmithEvaluator` encapsulates this logic and is used by both a CLI and an API route.

## How to Run
CLI (recommended during development):
```bash
# List datasets
pnpm tsx scripts/run-evaluation.ts --list-datasets

# Create dataset in LangSmith and run evaluation
pnpm tsx scripts/run-evaluation.ts --dataset basic --create-dataset --run-evaluation

# Limit the number of examples
pnpm tsx scripts/run-evaluation.ts --dataset all --run-evaluation --max-examples 5

# Save results to a file
pnpm tsx scripts/run-evaluation.ts --dataset toolUsage --run-evaluation --output eval-results.json
```

API (good for dashboards/automation):
```bash
curl -X POST http://localhost:3000/api/evaluation \
  -H "Content-Type: application/json" \
  -d '{"dataset":"basic","createDataset":true,"runEvaluation":true,"maxExamples":10}'
```

## Interpreting Results
- Look at average scores for a suite to gauge health
- Inspect worst-performing examples to plan targeted fixes
- Compare runs across branches/models to inform provider and configuration choices

## Extending Metrics (Roadmap)
Near-term enhancements we plan to add:
- Model-graded rubrics: Ask a reliable judge model to grade relevance, helpfulness, and safety
- Grounded accuracy checks: Retrieve news/market data snapshots and verify claims against them
- Semantic similarity: Compare responses to high-quality references with embedding similarity
- Safety checks: Detect prohibited statements (guarantees, specific investment directives without context)
- Confidence calibration: Penalize overconfident language without supporting evidence
- Cost/latency tracking: Join scores with tokens/latency to optimize for price-performance

## CI & Release Gating
- Add a CI job to run a small, representative subset on pull requests
- Fail the build on significant regressions in Overall or critical safety metrics
- Nightly full-suite evaluations to monitor drift across providers

## Tips for Better Scores
- Use tools when prompts demand current data (news, prices, events)
- Include disclaimers and risk framing; avoid absolute guarantees
- Provide structured, step-by-step reasoning and clear recommendations ranges (not absolutes)
- Clarify ambiguous requests before answering

## File Map
- `src/lib/evaluation/datasets.ts`: Examples and suites
- `src/lib/evaluation/langsmith-evaluator.ts`: Scoring and feedback logic
- `src/app/api/evaluation/route.ts`: HTTP interface for running evaluations
- `scripts/run-evaluation.ts`: CLI for local and CI runs
