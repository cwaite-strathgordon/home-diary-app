export type AiProviderName = 'openai' | 'deepseek';

export interface AiSettings {
  enabled: boolean;
  primaryProvider: AiProviderName;
  parallelEnabled: boolean;
  parallelProvider: AiProviderName;
  openAiModel: string;
  deepSeekModel: string;
  openAiApiKeyConfigured: boolean;
  deepSeekApiKeyConfigured: boolean;
}

export interface UpdateAiSettingsRequest {
  enabled: boolean;
  primaryProvider: AiProviderName;
  parallelEnabled: boolean;
  parallelProvider: AiProviderName;
  openAiModel: string;
  deepSeekModel: string;
  openAiApiKey?: string;
  deepSeekApiKey?: string;
  clearOpenAiApiKey: boolean;
  clearDeepSeekApiKey: boolean;
}
