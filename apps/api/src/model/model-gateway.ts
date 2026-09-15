export interface ModelGateway {
  generateJson(instructions: string, input: unknown): Promise<unknown>;
}