import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { AzureOpenAIModelGateway } from "./model/azure-openai-gateway.js";

const config = loadConfig();
const app = createApp(config, new AzureOpenAIModelGateway(config));

await app.listen({ port: config.PORT, host: config.HOST });