import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  OpenaiJsonSchema,
  OpenaiService,
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
}

export interface AiResult {
  text: string;
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
    if (!this.openaiService.isConfigured) {
      throw new ServiceUnavailableException(
        "Inteligência artificial não configurada.",
      );
    }

    const feature = AI_FEATURES[request.feature];
    const worstCaseCredits = this.pricingService.creditsForUsage(
      this.openaiService.estimateTokens(request.instructions + request.input),
      feature.maximumOutputTokens,
    );
    await this.walletService.ensureBalance(userId, worstCaseCredits);

    const result = await this.openaiService.generate({
      instructions: request.instructions,
      input: request.input,
      maximumOutputTokens: feature.maximumOutputTokens,
      jsonSchema: request.jsonSchema,
    });

    const credits = this.pricingService.creditsForUsage(
      result.inputTokens,
      result.outputTokens,
    );

    const { charged, balance } = await this.walletService.spend(userId, {
      amount: credits,
      description: feature.label,
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
}
