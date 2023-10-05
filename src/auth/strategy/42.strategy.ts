import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy as FortyTwoStrategy } from 'passport-42';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Strategy_42 extends PassportStrategy(FortyTwoStrategy) {
  constructor(
    @Inject('FortyTwoStrategy') private readonly authService: AuthService,
    config: ConfigService,
  ) {
    super({
      clientID: config.get('INTRA_CLIENT_ID'),
      clientSecret: config.get('INTRA_CLIENT_SECRET'),
      callbackURL: config.get('INTRA_CALLBACK_URL'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const user = await this.authService.validateUser({
      email: profile._json.email,
      login: profile._json.login,
      avatrURL: profile._json.image.link,
    });

    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
