import { Inject, Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('FortyTwoStrategy') private readonly authService: AuthService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  serializeUser(user: any, done: Function) {
    done(null, user);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async deserializeUser(payload: any, done: Function) {
    const user = await this.authService.findUser(payload.id);
    return user ? done(null, user) : done(null, null);
  }
}
