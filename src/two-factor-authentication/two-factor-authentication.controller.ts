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
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';

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

  @Post('enable')
  @UseGuards(JwtGuard)
  async turnOnTfa(@GetUser() user: User) {
    return await this.twoFactorAuthService.turnOnTfa(user);
  }

  @Post('disable')
  @UseGuards(JwtGuard)
  async turnOffTfa(@GetUser() user: User) {
    return await this.twoFactorAuthService.turnOffTfa(user);
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
