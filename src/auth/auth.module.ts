import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { Strategy_42 } from './strategy/42.strategy';
import { SessionSerializer } from './strategy/serilzer';
import { UsersService } from 'src/users/users.service';
import { CoreModule } from 'src/core/core.module';
// import { GlobalModule } from 'src/global/global.module';

@Module({
  imports: [JwtModule.register({}), CoreModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    Strategy_42,
    SessionSerializer,
    UsersService,
    {
      provide: 'FortyTwoStrategy',
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}
