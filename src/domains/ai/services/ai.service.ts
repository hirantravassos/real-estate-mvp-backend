import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  OpenaiCitation,
  OpenaiJsonSchema,
  OpenaiService,
  OpenaiWebSearch,
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
  /** Lets the AI search the web, each search is charged too. */
  webSearch?: OpenaiWebSearch;
}

export interface AiResult {
  text: string;
  creditsCharged: number;
  balance: number;
  /** Pages the answer was taken from, when the web was searched. */
  citations: OpenaiCitation[];
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
    if (!this.openaiService.isConfigured) {
      throw new ServiceUnavailableException(
        "Inteligência artificial não configurada.",
      );
    }

    const feature = AI_FEATURES[request.feature];
    const worstCaseCredits =
      request.fixedCredits ??
      this.pricingService.creditsForUsage(
        Math.max(
          this.openaiService.estimateTokens(
            request.instructions + request.input,
          ),
          request.webSearch ? feature.typicalInputTokens : 0,
        ),
        feature.maximumOutputTokens,
        request.webSearch ? (feature.typicalWebSearchCalls ?? 1) : 0,
      );
    await this.walletService.ensureBalance(userId, worstCaseCredits);

    const result = await this.openaiService.generate({
      instructions: request.instructions,
      input: request.input,
      maximumOutputTokens: feature.maximumOutputTokens,
      jsonSchema: request.jsonSchema,
      images: request.images,
      webSearch: request.webSearch,
    });

    const usedCredits = this.pricingService.creditsForUsage(
      result.inputTokens,
      result.outputTokens,
      result.webSearchCalls,
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
        result.webSearchCalls,
      ),
      referenceId: request.referenceId ?? null,
    });

    if (!result.text) {
      throw new ServiceUnavailableException(
        "A IA não trouxe uma resposta, tente de novo.",
      );
    }

    return {
      text: result.text,
      creditsCharged: charged,
      balance,
      citations: result.citations,
    };
  }
}
