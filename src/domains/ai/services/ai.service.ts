import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  OpenaiJsonSchema,
  OpenaiRespondRequest,
  OpenaiRespondResult,
  OpenaiService,
  OpenaiTranscribeRequest,
} from "../../../infrastructure/openai/services/openai.service";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import { AI_FEATURES, AiFeature } from "../ai-features.constant";

export interface AiRequest {
  feature: AiFeature;
  instructions: string;
  input: string;
  jsonSchema?: OpenaiJsonSchema;
  referenceId?: string | null;
  /** Charges this instead of the tokens used, when the tokens cost less. */
  fixedCredits?: number;
  /** Shown in the credit history instead of the feature name. */
  description?: string;
  /** Pictures for the AI to look at, as data URLs. */
  images?: string[];
}

export interface AiResult {
  text: string;
  creditsCharged: number;
  balance: number;
}

export interface AiSessionOptions {
  feature: AiFeature;
  referenceId?: string | null;
  description?: string;
}

export type AiSessionRespond = (
  request: Omit<OpenaiRespondRequest, "maximumOutputTokens">,
) => Promise<OpenaiRespondResult>;

export interface AiSessionResult<Value> {
  value: Value;
  creditsCharged: number;
  balance: number;
}

/**
 * Every AI call goes through here: checks the credits before calling,
 * then charges what was really used.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly pricingService: CreditPricingService,
    private readonly walletService: CreditWalletService,
  ) {}

  async generate(userId: string, request: AiRequest): Promise<AiResult> {
    this.requireConfigured();

    const feature = AI_FEATURES[request.feature];
    const worstCaseCredits =
      request.fixedCredits ??
      this.pricingService.creditsForUsage(
        this.openaiService.estimateTokens(request.instructions + request.input),
        feature.maximumOutputTokens,
      );
    await this.walletService.ensureBalance(userId, worstCaseCredits);

    const result = await this.openaiService.generate({
      instructions: request.instructions,
      input: request.input,
      maximumOutputTokens: feature.maximumOutputTokens,
      jsonSchema: request.jsonSchema,
      images: request.images,
    });

    const usedCredits = this.pricingService.creditsForUsage(
      result.inputTokens,
      result.outputTokens,
    );
    const credits = Math.max(usedCredits, request.fixedCredits ?? 0);

    const { charged, balance } = await this.walletService.spend(userId, {
      amount: credits,
      description: request.description ?? feature.label,
      feature: request.feature,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      providerCostUsd: this.openaiService.costInUsd(
        result.inputTokens,
        result.outputTokens,
      ),
      referenceId: request.referenceId ?? null,
    });

    if (!result.text) {
      throw new ServiceUnavailableException(
        "A IA não trouxe uma resposta, tente de novo.",
      );
    }

    return { text: result.text, creditsCharged: charged, balance };
  }

  /**
   * Several calls billed as one, for the assistant that looks things up in
   * steps before answering. What was used is charged even when a step fails,
   * since the provider charged us for it.
   */
  async session<Value>(
    userId: string,
    options: AiSessionOptions,
    work: (respond: AiSessionRespond) => Promise<Value>,
  ): Promise<AiSessionResult<Value>> {
    this.requireConfigured();

    const feature = AI_FEATURES[options.feature];
    await this.walletService.ensureBalance(
      userId,
      this.pricingService.featurePrice(options.feature),
    );

    const usage = { model: this.openaiService.model, input: 0, output: 0 };
    const respond: AiSessionRespond = async (request) => {
      const result = await this.openaiService.respond({
        ...request,
        maximumOutputTokens: feature.maximumOutputTokens,
      });
      usage.model = result.model;
      usage.input += result.inputTokens;
      usage.output += result.outputTokens;
      return result;
    };

    const charge = () =>
      this.walletService.spend(userId, {
        amount: this.pricingService.creditsForUsage(usage.input, usage.output),
        description: options.description ?? feature.label,
        feature: options.feature,
        model: usage.model,
        inputTokens: usage.input,
        outputTokens: usage.output,
        providerCostUsd: this.openaiService.costInUsd(
          usage.input,
          usage.output,
        ),
        referenceId: options.referenceId ?? null,
      });

    let value: Value;
    try {
      value = await work(respond);
    } catch (error) {
      if (usage.input + usage.output > 0) await charge().catch(() => null);
      throw error;
    }

    const { charged, balance } = await charge();
    return { value, creditsCharged: charged, balance };
  }

  /** Turns a voice recording into text, charging what the provider billed. */
  async transcribe(
    userId: string,
    request: OpenaiTranscribeRequest,
  ): Promise<AiResult> {
    this.requireConfigured();
    await this.walletService.ensureBalance(
      userId,
      this.pricingService.featurePrice("assistant_voice"),
    );

    const result = await this.openaiService.transcribe(request);
    const { charged, balance } = await this.walletService.spend(userId, {
      amount: this.pricingService.creditsForCostInUsd(result.costInUsd),
      description: AI_FEATURES.assistant_voice.label,
      feature: "assistant_voice",
      model: result.model,
      providerCostUsd: result.costInUsd,
    });

    if (!result.text) {
      throw new BadRequestException(
        "Não consegui ouvir nada nesse áudio, tente de novo.",
      );
    }

    return { text: result.text, creditsCharged: charged, balance };
  }

  private requireConfigured() {
    if (!this.openaiService.isConfigured) {
      throw new ServiceUnavailableException(
        "Inteligência artificial não configurada.",
      );
    }
  }
}
