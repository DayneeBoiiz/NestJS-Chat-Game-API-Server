import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    // Check if the token is blacklisted in the database
    const isTokenBlacklisted = await this.prisma.blockedTokens.findUnique({
      where: { token },
    });

    if (isTokenBlacklisted) {
      return false; // Block access if the token is blacklisted
    }

    return true; // Allow access if the token is not blacklisted
  }
}
