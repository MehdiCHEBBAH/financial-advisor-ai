import { Client } from 'langsmith';

export interface LangSmithConfig {
  apiKey?: string;
  project?: string;
  environment?: string;
  tracing?: boolean;
}

export class LangSmithService {
  private static instance: LangSmithService;
  private client: Client | null = null;
  private readonly config: LangSmithConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.initializeClient();
  }

  public static getInstance(): LangSmithService {
    if (!LangSmithService.instance) {
      LangSmithService.instance = new LangSmithService();
    }
    return LangSmithService.instance;
  }

  private loadConfig(): LangSmithConfig {
    return {
      apiKey: process.env.LANGSMITH_API_KEY,
      project: process.env.LANGSMITH_PROJECT || 'financial-adviser-ai',
      environment: process.env.LANGSMITH_ENVIRONMENT || 'development',
      tracing: process.env.LANGSMITH_TRACING !== 'false' && !!process.env.LANGSMITH_API_KEY,
    };
  }

  private initializeClient(): void {
    if (this.config.apiKey && this.config.tracing) {
      try {
        this.client = new Client({
          apiKey: this.config.apiKey,
          apiUrl: 'https://api.smith.langchain.com',
        });
        console.log('🔍 LangSmith client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize LangSmith client:', error);
        this.client = null;
      }
    } else {
      console.log('🔍 LangSmith tracing disabled (no API key or tracing disabled)');
    }
  }

  public isEnabled(): boolean {
    return this.client !== null && this.config.tracing === true;
  }

  public getClient(): Client | null {
    return this.client;
  }

  public getConfig(): LangSmithConfig {
    return { ...this.config };
  }

  public getProjectName(): string {
    return this.config.project || 'financial-adviser-ai';
  }

  public getEnvironment(): string {
    return this.config.environment || 'development';
  }

  public async createRun(
    name: string,
    inputs: Record<string, unknown>,
    runType: 'llm' | 'chain' | 'tool' | 'retriever' = 'chain'
  ) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      return await this.client!.createRun({
        name,
        run_type: runType,
        inputs,
        project_name: this.getProjectName(),
        extra: {
          environment: this.getEnvironment(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Failed to create LangSmith run:', error);
      return null;
    }
  }

  public async updateRun(
    runId: string,
    updates: {
      outputs?: Record<string, unknown>;
      error?: string;
      endTime?: Date;
      extra?: Record<string, unknown>;
    }
  ) {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.client!.updateRun(runId, updates);
    } catch (error) {
      console.error('❌ Failed to update LangSmith run:', error);
    }
  }

  public async createFeedback(
    runId: string,
    feedback: {
      key: string;
      score?: number;
      value?: string | number | boolean;
      comment?: string;
    }
  ) {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.client!.createFeedback(runId, feedback.key, feedback);
    } catch (error) {
      console.error('❌ Failed to create LangSmith feedback:', error);
    }
  }

  public async createDataset(
    name: string,
    description?: string
  ) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      return await this.client!.createDataset(name, {
        description,
        dataType: 'kv',
      });
    } catch (error) {
      console.error('❌ Failed to create LangSmith dataset:', error);
      return null;
    }
  }

  public async createExample(
    datasetId: string,
    inputs: Record<string, unknown>,
    outputs?: Record<string, unknown>
  ) {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      return await this.client!.createExample({
        dataset_id: datasetId,
        inputs,
        outputs,
      });
    } catch (error) {
      console.error('❌ Failed to create LangSmith example:', error);
      return null;
    }
  }
}

// Export singleton instance
export const langsmithService = LangSmithService.getInstance();
