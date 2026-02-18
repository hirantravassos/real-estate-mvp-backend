import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

// Forward reference to avoid circular dependency — the entity import is deferred

const getSubscriptionEntity = () =>
  require('../../domains/subscription/entities/subscription.entity')
    .Subscription;

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(getSubscriptionEntity())
    private readonly subscriptionRepository: Repository<{
      userId: string;
      isActive: boolean;
    }>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { userId: user.userId, isActive: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'Assinatura ativa é necessária para acessar este recurso',
      );
    }

    return true;
  }
}
