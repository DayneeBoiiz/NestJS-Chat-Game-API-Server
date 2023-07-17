import {
  ClassSerializerInterceptor,
  Controller,
  UseInterceptors,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  Get,
} from '@nestjs/common';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { JwtGuard } from 'src/auth/guard';
import { Request, Response } from 'express';
import * as speakeasy from 'speakeasy';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('2fa')
@UseInterceptors(ClassSerializerInterceptor)
export class TwoFactorAuthenticationController {
  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthenticationService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post('Generate')
  @UseGuards(JwtGuard)
  async register(@Req() req: Request, @Res() res: Response) {
    // console.log(req.user);
    // console.log(res);
    const { otpauthUrl } =
      await this.twoFactorAuthService.generateTwoFactorAuthenticationSecret(
        req.user,
      );

    return this.twoFactorAuthService.pipeQrCodeStream(res, otpauthUrl);
  }

  @Post('verify')
  @UseGuards(JwtGuard)
  async verify2FA(@Body() code, @Req() req) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    const secret = user.TwofaAutSecret;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code.code,
    });

    return verified;
    // console.log(code);
    // console.log(secret);
  }

  @Post('change')
  @UseGuards(JwtGuard)
  async change(@Req() req) {
    if (req.user.TwofaAutEnabled === true) {
      await this.prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          TwofaAutEnabled: false,
        },
      });
    } else if (req.user.TwofaAutEnabled === false) {
      // console.log('Hello World');
      await this.prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          TwofaAutEnabled: true,
        },
      });
    }
    // console.log(req);
  }

  @Get('status')
  @UseGuards(JwtGuard)
  async get2faStatus(@Req() req) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
    });

    return user.TwofaAutEnabled;
  }
}
