# API Key Management & Error Handling

This document describes the comprehensive API key management and error handling system implemented for the Financial Adviser AI application.

## 🎯 **Features Implemented**

### 1. **User API Key Management**

- **Local Storage**: Users can add their own API keys that are stored locally
- **Priority System**: User keys take precedence over server environment keys
- **Key Validation**: Basic format validation for different providers
- **Secure Storage**: Keys are stored in browser localStorage with proper error handling

### 2. **Model Configuration Status**

- **Real-time Status**: Shows which models are configured and ready to use
- **Visual Indicators**: Clear icons and status messages for each model
- **Error Messages**: Specific error messages for missing keys, quota issues, etc.

### 3. **Enhanced Error Handling**

- **Structured Errors**: Categorized error types (missing_key, quota_exceeded, model_not_supported, unknown)
- **User-Friendly Messages**: Clear, actionable error messages
- **Retry Mechanisms**: Users can retry failed requests
- **Error Dismissal**: Users can dismiss error messages

### 4. **UI Components**

#### **APIKeyManager Component**

- Modal interface for managing API keys
- Support for all providers (OpenAI, Google AI, Anthropic, X.AI)
- Key visibility toggle for security
- Validation before saving
- Clear all keys functionality

#### **EnhancedModelSelector Component**

- Shows model configuration status
- Provider-specific icons
- Status indicators (configured, requires user key, error)
- Disabled state for unconfigured models

#### **ErrorDisplay Component**

- Contextual error messages
- Action buttons (retry, add API key, refresh)
- Dismissible errors
- Provider-specific error handling

#### **Enhanced ChatInput Component**

- Warning messages for unconfigured models
- Disabled state when model not configured
- Dynamic placeholder text based on model status

## 🔧 **Technical Implementation**

### **API Key Service (`src/lib/services/api-key.service.ts`)**

```typescript
class APIKeyService {
  // Get user API keys from localStorage
  static getUserAPIKeys(): UserAPIKeys;

  // Save user API keys to localStorage
  static saveUserAPIKeys(keys: UserAPIKeys): void;

  // Check if API key is configured (user or environment)
  static isAPIKeyConfigured(provider: string): boolean;

  // Get effective API key (user key takes precedence)
  static getEffectiveAPIKey(provider: string): string | undefined;

  // Check model configuration status
  static checkModelConfigurationStatus(): Promise<ModelConfigurationStatus>;

  // Parse API errors into structured format
  static parseAPIError(
    error: any,
    model?: string,
    provider?: string
  ): APIKeyError;

  // Validate API key format
  static validateAPIKey(
    provider: string,
    key: string
  ): { valid: boolean; error?: string };
}
```

### **Enhanced LLM Provider (`src/lib/agent/llm-providers.ts`)**

- Uses user API keys when available
- Falls back to environment variables
- Throws structured errors for better UI handling
- Maintains fallback dummy responses for development

### **API Endpoints**

- **`/api/models/status`**: Returns model configuration status
- **`/api/chat`**: Enhanced with better error handling and user key support

## 🎨 **User Experience**

### **Model Selection**

1. **Configured Models**: Show with green checkmark, ready to use
2. **User Key Required**: Show with yellow key icon, requires user input
3. **Not Configured**: Show with red error icon, disabled

### **Error Handling Flow**

1. **User sends message** → System checks model configuration
2. **If unconfigured** → Shows warning in input, disables send button
3. **If API error occurs** → Shows structured error message with actions
4. **User can retry** → Clears error and retries last message
5. **User can add API key** → Opens API key manager modal

### **API Key Management Flow**

1. **User clicks "API Keys" button** → Opens management modal
2. **User enters API keys** → System validates format
3. **User saves keys** → Keys stored locally, model status updated
4. **User can clear keys** → Removes all user keys, falls back to environment

## 🔒 **Security Considerations**

- **Local Storage Only**: User keys never sent to server
- **Key Validation**: Basic format validation prevents obvious mistakes
- **Error Sanitization**: Error messages don't expose sensitive information
- **Fallback Security**: Falls back to environment variables when user keys unavailable

## 🚀 **Usage Examples**

### **Adding API Keys**

```typescript
// User adds OpenAI API key
const userKeys = { openai: 'sk-...' };
APIKeyService.saveUserAPIKeys(userKeys);

// Check if model is configured
const isConfigured = APIKeyService.isAPIKeyConfigured('openai');
```

### **Error Handling**

```typescript
// Parse API error
const error = APIKeyService.parseAPIError(apiError, 'grok-2-1212', 'openai');
// Returns: { type: 'missing_key', message: 'API key required', ... }

// Check model status
const status = await APIKeyService.checkModelConfigurationStatus();
// Returns: { models: [...], hasAnyConfigured: boolean, errors: [...] }
```

## 📱 **UI States**

### **Model Selector States**

- ✅ **Ready**: Model configured and ready
- 🔑 **User Key Required**: Needs user API key
- ❌ **Not Configured**: No API key available
- ⚠️ **Error**: Configuration error

### **Chat Input States**

- **Normal**: Ready to send messages
- **Warning**: Model not configured, shows warning
- **Disabled**: Model not configured, input disabled

### **Error Display States**

- **Missing Key**: Shows "Add API Key" button
- **Quota Exceeded**: Shows "Try Again" button
- **Model Not Supported**: Shows "Refresh Models" button
- **Unknown Error**: Shows "Try Again" button

## 🔄 **Fallback Behavior**

1. **User API Key Available** → Use user key
2. **Environment Variable Available** → Use environment key
3. **No Key Available** → Show error, disable model
4. **API Error Occurs** → Show structured error message
5. **Unknown Error** → Fall back to dummy response (development only)

This system provides a robust, user-friendly way to manage API keys and handle errors gracefully while maintaining security and providing clear feedback to users.
