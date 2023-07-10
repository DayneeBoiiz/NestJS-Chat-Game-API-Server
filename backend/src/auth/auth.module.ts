import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { Strategy_42 } from './strategy/42.strategy';
import { SessionSerializer } from './strategy/serilzer';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    Strategy_42,
    SessionSerializer,
    {
      provide: 'FortyTwoStrategy',
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}
