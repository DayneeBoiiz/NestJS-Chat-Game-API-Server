import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDtoLogin, AuthDtoRegister } from './dto';
import { FortyTwoStrategy } from './strategy/42.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: AuthDtoRegister) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: AuthDtoLogin) {
    return this.authService.login(dto);
  }

  @Get('/cookie/login')
  async CookieLogin(@Req() req: Request) {
    console.log(req);
  }

  @Get('42/login')
  @UseGuards(FortyTwoStrategy)
  handle42Login() {
    return 'Hello World';
  }

  @Get('42/callback')
  @Redirect('http://localhost:5173/login/success')
  @UseGuards(FortyTwoStrategy)
  handle42Redirect(@Req() req: Request) {
    return req.user;
  }
}
