import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDtoLogin, AuthDtoRegister } from './dto';
import { FortyTwoStrategy } from './strategy/42.guard';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: AuthDtoRegister) {
    try {
      return this.authService.register(dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  @Post('login')
  async login(@Body() dto: AuthDtoLogin) {
    try {
      return this.authService.login(dto);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  @Get('42/login')
  @UseGuards(FortyTwoStrategy)
  handle42Login() {}

  @Get('42/callback')
  @UseGuards(FortyTwoStrategy)
  handle42Redirect(@Req() req: Request, @Res() res: Response) {
    try {
      const token = req.user;
      res.cookie('token', token, { httpOnly: false });
      res.redirect('/auth/success');
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  @Get('success')
  handleSuccess(@Req() req: Request) {}
}
