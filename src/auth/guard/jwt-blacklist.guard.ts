import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    const isTokenBlacklisted = await this.prisma.blockedTokens.findUnique({
      where: { token },
    });

    if (isTokenBlacklisted) {
      return false;
    }

    return true;
  }
}
