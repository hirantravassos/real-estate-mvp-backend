import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { creditsConfig } from "../../../config/credits.config";
import { OpenaiService } from "../../../infrastructure/openai/services/openai.service";
import { CREDIT_PACKAGES } from "../constants/credit-packages.constant";
import { AI_FEATURES, AiFeature } from "../../ai/ai-features.constant";

/**
 * Turns AI token usage into credits.
 *
 * credits = ceil(provider cost in BRL x profit multiplier / cheapest credit price)
 *
 * The multiplier is never below 3 and the credit price is the cheapest one
 * a broker can buy, so the price of every call is at least 3x what it cost.
 */
@Injectable()
export class CreditPricingService {
  constructor(
    @Inject(creditsConfig.KEY)
    private readonly configuration: ConfigType<typeof creditsConfig>,
    private readonly openaiService: OpenaiService,
  ) {}

  get cheapestCreditPriceInBrl() {
    return Math.min(
      ...CREDIT_PACKAGES.map(
        (creditPackage) => creditPackage.amountInBrl / creditPackage.credits,
      ),
    );
  }

  creditsForUsage(
    inputTokens: number,
    outputTokens: number,
    webSearchCalls = 0,
  ) {
    return this.creditsForCostInUsd(
      this.openaiService.costInUsd(inputTokens, outputTokens, webSearchCalls),
    );
  }

  creditsForCostInUsd(costInUsd: number) {
    const costInBrl = costInUsd * this.configuration.usdToBrlRate;
    const priceInBrl = costInBrl * this.configuration.profitMultiplier;
    return Math.max(1, Math.ceil(priceInBrl / this.cheapestCreditPriceInBrl));
  }

  /** Credits a usual call of each feature costs, shown before using it. */
  featureEstimates() {
    return Object.fromEntries(
      (Object.keys(AI_FEATURES) as AiFeature[]).map((feature) => [
        feature,
        this.featurePrice(feature),
      ]),
    ) as Record<AiFeature, number>;
  }

  /** Credits a usual call costs, or the fixed price of fixed price features. */
  featurePrice(feature: AiFeature) {
    const definition = AI_FEATURES[feature];
    const credits =
      definition.typicalCostInUsd === undefined
        ? this.creditsForUsage(
            definition.typicalInputTokens,
            definition.typicalOutputTokens,
            definition.typicalWebSearchCalls ?? 0,
          )
        : this.creditsForCostInUsd(definition.typicalCostInUsd);
    return Math.ceil(credits * (definition.fixedPriceSafetyMultiplier ?? 1));
  }
}
