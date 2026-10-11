import { SetMetadata } from "@nestjs/common";
import { PlanLimitResource } from "../enums/subscription.enum";

export const SKIP_SUBSCRIPTION_CHECK_KEY = "skipSubscriptionCheck";
export const PLAN_LIMIT_KEY = "planLimit";

export interface PlanLimitRequirement {
  resource: PlanLimitResource;
  /** Body field holding a list, each item counts as one new record. */
  countBodyList?: string;
}

/** Opens the route even with the subscription expired, like billing itself. */
export const SkipSubscriptionCheck = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);

/** Refuses the creation once the plan limit of the resource is reached. */
export const PlanLimit = (
  resource: PlanLimitResource,
  options: Omit<PlanLimitRequirement, "resource"> = {},
): MethodDecorator =>
  SetMetadata<string, PlanLimitRequirement>(PLAN_LIMIT_KEY, {
    resource,
    ...options,
  });
