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
      clientID: config.get('clientID'),
      clientSecret: config.get('clientSecret'),
      callbackURL: 'http://localhost:9000/auth/42/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    // console.log(accessToken);
    // console.log(refreshToken);
    // console.log(profile._json.image.link);

    const user = await this.authService.validateUser({
      email: profile._json.email,
      login: profile._json.login,
      avatrURL: profile._json.image.link,
    });

    // console.log(user);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
