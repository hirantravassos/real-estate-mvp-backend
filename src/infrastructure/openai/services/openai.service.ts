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
/** Searching the web takes longer than a plain answer. */
const WEB_SEARCH_TIMEOUT_MILLISECONDS = 180_000;

export interface OpenaiJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface OpenaiWebSearch {
  /** Only pages from these domains are searched, written without https. */
  allowedDomains?: string[];
  /** Two letter country code the results are tuned to. */
  country: string;
  city?: string;
  region?: string;
}

export interface OpenaiGenerateRequest {
  instructions: string;
  input: string;
  maximumOutputTokens: number;
  jsonSchema?: OpenaiJsonSchema;
  /** Pictures sent along, as data URLs, read in low detail to keep it cheap. */
  images?: string[];
  /** Lets the model search the web before answering. */
  webSearch?: OpenaiWebSearch;
}

export interface OpenaiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** How many web searches the model ran, each one is billed apart. */
  webSearchCalls: number;
}

export interface OpenaiCitation {
  url: string;
  title: string;
}

export interface OpenaiGenerateResult extends OpenaiUsage {
  text: string;
  /** Pages the answer was taken from, when the web was searched. */
  citations: OpenaiCitation[];
}

interface ResponsesApiBody {
  model?: string;
  status?: string;
  output?: {
    type: string;
    content?: {
      type: string;
      text?: string;
      annotations?: { type: string; url?: string; title?: string }[];
    }[];
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
  costInUsd(inputTokens: number, outputTokens: number, webSearchCalls = 0) {
    return (
      (inputTokens / 1_000_000) * this.configuration.inputCostPerMillionUsd +
      (outputTokens / 1_000_000) * this.configuration.outputCostPerMillionUsd +
      webSearchCalls * this.configuration.webSearchCostPerCallUsd
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
      body.reasoning = {
        effort:
          request.webSearch && this.configuration.reasoningEffort === "minimal"
            ? this.configuration.webSearchReasoningEffort
            : this.configuration.reasoningEffort,
      };
    }

    if (request.webSearch) {
      body.tools = [
        {
          type: "web_search",
          search_context_size: "medium",
          user_location: {
            type: "approximate",
            country: request.webSearch.country,
            ...(request.webSearch.city ? { city: request.webSearch.city } : {}),
            ...(request.webSearch.region
              ? { region: request.webSearch.region }
              : {}),
          },
          ...(request.webSearch.allowedDomains?.length
            ? {
                filters: {
                  allowed_domains: request.webSearch.allowedDomains,
                },
              }
            : {}),
        },
      ];
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
      signal: AbortSignal.timeout(
        request.webSearch
          ? WEB_SEARCH_TIMEOUT_MILLISECONDS
          : REQUEST_TIMEOUT_MILLISECONDS,
      ),
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

    const output = result.output ?? [];
    const texts = output
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text");
    const text = texts
      .map((content) => content.text ?? "")
      .join("")
      .trim();

    const citations = new Map<string, OpenaiCitation>();
    for (const annotation of texts.flatMap(
      (content) => content.annotations ?? [],
    )) {
      if (annotation.type !== "url_citation" || !annotation.url) continue;
      citations.set(annotation.url, {
        url: annotation.url,
        title: annotation.title ?? annotation.url,
      });
    }

    return {
      text,
      citations: [...citations.values()],
      model: result.model ?? this.configuration.model,
      inputTokens: result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
      webSearchCalls: output.filter((item) => item.type === "web_search_call")
        .length,
    };
  }
}
