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
  /** Pictures sent along, as data URLs, read in low detail to keep it cheap. */
  images?: string[];
}

export interface OpenaiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface OpenaiGenerateResult extends OpenaiUsage {
  text: string;
}

/** A function the model may call, described with a strict JSON schema. */
export interface OpenaiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** One item of a Responses API conversation, sent back as it came. */
export type OpenaiConversationItem = Record<string, unknown>;

export interface OpenaiRespondRequest {
  instructions: string;
  input: OpenaiConversationItem[];
  tools: OpenaiTool[];
  maximumOutputTokens: number;
  /** "none" makes the model answer with what it has, without more calls. */
  toolChoice?: "auto" | "none";
}

export interface OpenaiFunctionCall {
  callId: string;
  name: string;
  argumentsJson: string;
}

export interface OpenaiRespondResult extends OpenaiUsage {
  text: string;
  functionCalls: OpenaiFunctionCall[];
  /** Everything the model produced, to append to the next call's input. */
  outputItems: OpenaiConversationItem[];
}

export interface OpenaiTranscribeRequest {
  audio: Buffer;
  mimeType: string;
  fileName: string;
  /** Words the speech is likely to have, so names come out right. */
  prompt?: string;
}

export interface OpenaiTranscribeResult {
  text: string;
  model: string;
  costInUsd: number;
}

interface ResponsesApiBody {
  model?: string;
  status?: string;
  output?: {
    type: string;
    content?: { type: string; text?: string }[];
    call_id?: string;
    name?: string;
    arguments?: string;
  }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string } | null;
}

interface TranscriptionApiBody {
  text?: string;
  usage?: {
    type?: "tokens" | "duration";
    input_token_details?: { audio_tokens?: number; text_tokens?: number };
    input_tokens?: number;
    output_tokens?: number;
    seconds?: number;
  };
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
    this.requireConfigured();

    const body: Record<string, unknown> = {
      model: this.configuration.model,
      instructions: request.instructions,
      input: request.images?.length
        ? [
            {
              role: "user",
              content: [
                { type: "input_text", text: request.input },
                ...request.images.map((image) => ({
                  type: "input_image",
                  image_url: image,
                  detail: "low",
                })),
              ],
            },
          ]
        : request.input,
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

    const result = await this.postResponses(body);

    return {
      text: textOf(result),
      model: result.model ?? this.configuration.model,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
    };
  }

  /**
   * One step of a conversation where the model may call tools. Nothing is
   * stored at OpenAI, so the reasoning comes back encrypted and goes along
   * with the next step.
   */
  async respond(request: OpenaiRespondRequest): Promise<OpenaiRespondResult> {
    this.requireConfigured();

    const body: Record<string, unknown> = {
      model: this.configuration.model,
      instructions: request.instructions,
      input: request.input,
      tools: request.tools.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: true,
      })),
      tool_choice: request.toolChoice ?? "auto",
      max_output_tokens: request.maximumOutputTokens,
      store: false,
    };

    if (this.configuration.reasoningEffort) {
      body.reasoning = { effort: this.configuration.reasoningEffort };
      body.include = ["reasoning.encrypted_content"];
    }

    const result = await this.postResponses(body);
    const output = result.output ?? [];

    return {
      text: textOf(result),
      functionCalls: output
        .filter((item) => item.type === "function_call")
        .map((item) => ({
          callId: item.call_id ?? "",
          name: item.name ?? "",
          argumentsJson: item.arguments ?? "{}",
        })),
      outputItems: output as unknown as OpenaiConversationItem[],
      model: result.model ?? this.configuration.model,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
    };
  }

  /** Turns a voice recording into text, in Portuguese. */
  async transcribe(
    request: OpenaiTranscribeRequest,
  ): Promise<OpenaiTranscribeResult> {
    this.requireConfigured();

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(request.audio)], { type: request.mimeType }),
      request.fileName,
    );
    form.append("model", this.configuration.transcriptionModel);
    form.append("language", "pt");
    form.append("response_format", "json");
    if (request.prompt) form.append("prompt", request.prompt);

    const response = await fetch(
      `${this.configuration.baseUrl}/audio/transcriptions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.configuration.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
      },
    ).catch((error: unknown) => {
      this.logger.error(`OpenAI transcription unreachable: ${String(error)}`);
      throw new ServiceUnavailableException(
        "Não consegui ouvir o áudio agora, tente de novo.",
      );
    });

    const result = (await response
      .json()
      .catch(() => ({}))) as TranscriptionApiBody;

    if (!response.ok) {
      this.logger.error(
        `OpenAI transcription answered ${response.status}: ${result.error?.message ?? "unknown"}`,
      );
      throw new BadGatewayException("Não consegui entender o áudio.");
    }

    return {
      text: (result.text ?? "").trim(),
      model: this.configuration.transcriptionModel,
      costInUsd: this.transcriptionCostInUsd(result.usage),
    };
  }

  private transcriptionCostInUsd(usage: TranscriptionApiBody["usage"]) {
    if (usage?.type === "duration") {
      return (
        ((usage.seconds ?? 0) / 60) *
        this.configuration.transcriptionCostPerMinuteUsd
      );
    }
    const audioTokens =
      usage?.input_token_details?.audio_tokens ?? usage?.input_tokens ?? 0;
    const textTokens = usage?.input_token_details?.text_tokens ?? 0;
    return (
      (audioTokens / 1_000_000) *
        this.configuration.transcriptionAudioCostPerMillionUsd +
      ((textTokens + (usage?.output_tokens ?? 0)) / 1_000_000) *
        this.configuration.transcriptionTextCostPerMillionUsd
    );
  }

  private requireConfigured() {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        "Inteligência artificial não configurada.",
      );
    }
  }

  private async postResponses(body: Record<string, unknown>) {
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

    return result;
  }
}

const textOf = (result: ResponsesApiBody) =>
  (result.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("")
    .trim();
