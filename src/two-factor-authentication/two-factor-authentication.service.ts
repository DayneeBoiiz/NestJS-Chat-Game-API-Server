import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { Response } from 'express';
import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TwoFactorAuthenticationService {
  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  public async generateTwoFactorAuthenticationSecret(user: any) {
    const secret = authenticator.generateSecret();

    const otpauthUrl = authenticator.keyuri(
      user.email,
      this.configService.get('TWO_FACTOR_AUTHENTICATION_APP_NAME'),
      secret,
    );
    // // console.log(user);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        TwofaAutSecret: secret,
      },
    });

    return { secret, otpauthUrl };
  }

  public async pipeQrCodeStream(stream: Response, otpauthUrl: string) {
    return toFileStream(stream, otpauthUrl);
  }

  async turnOnTfa(user: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        TwofaAutEnabled: true,
      },
    });

    return { message: '2fa enabled' };
  }

  async turnOffTfa(user: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        TwofaAutEnabled: false,
      },
    });

    return { message: '2fa disabled' };
  }
}
