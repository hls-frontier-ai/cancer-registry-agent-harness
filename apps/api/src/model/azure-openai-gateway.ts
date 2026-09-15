import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { AzureOpenAI } from "openai";
import type { AppConfig } from "../config.js";
import type { ModelGateway } from "./model-gateway.js";

export class AzureOpenAIModelGateway implements ModelGateway {
  private readonly client: AzureOpenAI;

  public constructor(private readonly config: AppConfig) {
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      "https://cognitiveservices.azure.com/.default",
    );

    this.client = new AzureOpenAI({
      azureADTokenProvider,
      endpoint: config.AZURE_OPENAI_ENDPOINT,
      apiVersion: config.AZURE_OPENAI_API_VERSION,
      deployment: config.AZURE_OPENAI_DEPLOYMENT,
    });
  }

  public async generateJson(instructions: string, input: unknown): Promise<unknown> {
    const completion = await this.client.chat.completions.create({
      model: this.config.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("Azure OpenAI returned an empty response");
    }

    return JSON.parse(content) as unknown;
  }
}