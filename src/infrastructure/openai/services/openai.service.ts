import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { openaiConfig } from "../../../config/openai.config";

const REQUEST_TIMEOUT_MILLISECONDS = 90_000;

export interface OpenaiJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface OpenaiGenerateRequest {
  instructions: string;
  input: string;
  maximumOutputTokens: number;
  jsonSchema?: OpenaiJsonSchema;
}

export interface OpenaiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface OpenaiGenerateResult extends OpenaiUsage {
  text: string;
}

interface ResponsesApiBody {
  model?: string;
  status?: string;
  output?: {
    type: string;
    content?: { type: string; text?: string }[];
  }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string } | null;
}

/** Calls the OpenAI Responses API and reports the tokens it used. */
@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);

  constructor(
    @Inject(openaiConfig.KEY)
    private readonly configuration: ConfigType<typeof openaiConfig>,
  ) {}

  get isConfigured() {
    return Boolean(this.configuration.apiKey);
  }

  get model() {
    return this.configuration.model;
  }

  /** What one call costs us in US dollars. */
  costInUsd(inputTokens: number, outputTokens: number) {
    return (
      (inputTokens / 1_000_000) * this.configuration.inputCostPerMillionUsd +
      (outputTokens / 1_000_000) * this.configuration.outputCostPerMillionUsd
    );
  }

  /** Rough count used before the call, about three characters per token in Portuguese. */
  estimateTokens(text: string) {
    return Math.ceil(text.length / 3) + 50;
  }

  async generate(
    request: OpenaiGenerateRequest,
  ): Promise<OpenaiGenerateResult> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "Inteligência artificial não configurada.",
      );
    }

    const body: Record<string, unknown> = {
      model: this.configuration.model,
      instructions: request.instructions,
      input: request.input,
      max_output_tokens: request.maximumOutputTokens,
      store: false,
    };

    if (this.configuration.reasoningEffort) {
      body.reasoning = { effort: this.configuration.reasoningEffort };
    }

    if (request.jsonSchema) {
      body.text = {
        format: {
          type: "json_schema",
          name: request.jsonSchema.name,
          schema: request.jsonSchema.schema,
          strict: true,
        },
      };
    }

    const response = await fetch(`${this.configuration.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.configuration.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    }).catch((error: unknown) => {
      this.logger.error(`OpenAI unreachable: ${String(error)}`);
      throw new ServiceUnavailableException(
        "A IA não respondeu, tente de novo.",
      );
    });

    const result = (await response
      .json()
      .catch(() => ({}))) as ResponsesApiBody;

    if (!response.ok) {
      this.logger.error(
        `OpenAI answered ${response.status}: ${result.error?.message ?? "unknown"}`,
      );
      throw new BadGatewayException("A IA não conseguiu responder agora.");
    }

    const text = (result.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text ?? "")
      .join("")
      .trim();

    return {
      text,
      model: result.model ?? this.configuration.model,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
    };
  }
}
