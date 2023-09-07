import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { GameGateway } from './game.gateway';
// import { GlobalGateway } from 'src/global/global.gateway';
import { UsersService } from 'src/users/users.service';
import { PusherModule } from 'src/pusher/pusher.module';
import { CoreGateway } from 'src/core/core.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    PusherModule,
  ],
  providers: [
    GameService,
    JwtBlacklistGuard,
    GameGateway,
    CoreGateway,
    UsersService,
  ],
  controllers: [GameController],
})
export class GameModule {}
