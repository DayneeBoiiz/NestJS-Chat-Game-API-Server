import {
  Body,
  Controller,
  Get,
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
  @UseGuards(FortyTwoStrategy)
  handle42Redirect(@Req() req: Request, @Res() res: Response) {
    const token = req.user;
    // console.log(token);
    res.cookie('token', token, { httpOnly: false });
    res.redirect('/auth/success');
  }

  @Get('success')
  handleSuccess(@Req() req: Request) {
    // You can access the user object from the cookie
    // const token = req.cookies.token;
    // // Handle the user data or return a response to the frontend
    // return { token };
    // console.log(req);
  }
}
