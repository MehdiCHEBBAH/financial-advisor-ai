// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: '.env' });

// Debug: Check if environment variables are loaded
console.log('🔍 Environment check:');
console.log('LANGSMITH_API_KEY:', process.env.LANGSMITH_API_KEY ? '✅ Set' : '❌ Not set');
console.log('LANGSMITH_PROJECT:', process.env.LANGSMITH_PROJECT || 'default');
console.log('LANGSMITH_TRACING:', process.env.LANGSMITH_TRACING);
