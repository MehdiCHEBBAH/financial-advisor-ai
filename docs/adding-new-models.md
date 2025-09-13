# Adding New LLM Models

This guide explains how to easily add new LLM models to the Financial Adviser AI.

## Quick Start

To add a new model, simply update the `MODEL_CONFIGS` array in `src/lib/agent/models.ts`:

```typescript
export const MODEL_CONFIGS: ModelConfig[] = [
  // ... existing models ...
  {
    id: 'your-new-model-id',
    name: 'Your New Model Name',
    provider: 'your-provider', // 'openai', 'google', 'anthropic', 'x-ai', or custom
    model: 'actual-model-name', // The actual model name used by the provider
    description: 'Description of your model',
    maxTokens: 4096,
    temperature: {
      min: 0,
      max: 2,
      default: 0.7,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
    },
  },
];
```

## Supported Providers

### 1. OpenAI

```typescript
{
  id: 'gpt-4o',
  name: 'GPT-4o',
  provider: 'openai',
  model: 'gpt-4o',
  // ... other config
}
```

### 2. Google (Gemini)

```typescript
{
  id: 'gemini-2.0-flash',
  name: 'Gemini 2.0 Flash',
  provider: 'google',
  model: 'gemini-2.0-flash',
  // ... other config
}
```

### 3. Anthropic (Claude)

```typescript
{
  id: 'claude-3-5-sonnet',
  name: 'Claude 3.5 Sonnet',
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  // ... other config
}
```

### 4. X.AI (Grok)

```typescript
{
  id: 'grok-3',
  name: 'Grok-3',
  provider: 'x-ai',
  model: 'grok-3',
  // ... other config
}
```

## Adding Custom Providers

If you want to add a completely new provider, follow these steps:

### 1. Update the Provider Type

In `src/lib/agent/types.ts`:

```typescript
export interface ModelConfig {
  // ... existing fields ...
  provider: 'openai' | 'google' | 'anthropic' | 'x-ai' | 'your-provider';
}
```

### 2. Add Provider Implementation

In `src/lib/agent/llm-providers.ts`:

```typescript
private static getProvider(modelConfig: ModelConfig) {
  switch (modelConfig.provider) {
    // ... existing cases ...
    case 'your-provider':
      return yourProvider(modelConfig.model)
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`)
  }
}
```

### 3. Install Provider SDK

```bash
pnpm add @ai-sdk/your-provider
```

### 4. Import and Use

```typescript
import { yourProvider } from '@ai-sdk/your-provider';
```

## Model Configuration Options

### Required Fields

- `id`: Unique identifier for the model
- `name`: Display name for the UI
- `provider`: Provider type
- `model`: Actual model name used by the provider
- `description`: Description shown in the UI
- `maxTokens`: Maximum tokens for the model
- `temperature`: Temperature range and default
- `capabilities`: What the model can do

### Capabilities

```typescript
capabilities: {
  streaming: boolean,      // Can stream responses
  functionCalling: boolean, // Supports function calling
  vision: boolean          // Can process images
}
```

### Temperature Range

```typescript
temperature: {
  min: 0,        // Minimum temperature
  max: 2,        // Maximum temperature
  default: 0.7   // Default temperature
}
```

## Example: Adding GPT-4o Mini

```typescript
{
  id: 'gpt-4o-mini',
  name: 'GPT-4o Mini',
  provider: 'openai',
  model: 'gpt-4o-mini',
  description: 'Fast and efficient GPT-4o model for quick responses',
  maxTokens: 128000,
  temperature: {
    min: 0,
    max: 2,
    default: 0.7
  },
  capabilities: {
    streaming: true,
    functionCalling: true,
    vision: true
  }
}
```

## Testing New Models

1. Add the model to `MODEL_CONFIGS`
2. Restart the development server
3. Test via API:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"model":"your-new-model-id","messages":[{"role":"user","content":"Hello"}],"stream":false}'
   ```
4. Test in the UI by selecting the model from the dropdown

## Environment Variables

For production, you'll need to set up API keys:

```bash
# .env.local
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key
ANTHROPIC_API_KEY=your_anthropic_key
XAI_API_KEY=your_xai_key
```

## Fallback Behavior

If API keys are not configured or there's an error, the system will:

1. Log the error to the console
2. Return a contextual fallback response
3. Indicate it's a demo response in the output

This ensures the application works even without proper API configuration during development.
