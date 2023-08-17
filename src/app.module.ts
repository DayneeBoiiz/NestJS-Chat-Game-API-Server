import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TwoFactorAuthenticationService } from './two-factor-authentication/two-factor-authentication.service';
import { TwoFactorAuthenticationController } from './two-factor-authentication/two-factor-authentication.controller';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat/chat.service';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat/chat.controller';
import { GameModule } from './game/game.module';
import { GlobalGateway } from './global/global.gateway';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    GameModule,
  ],
  controllers: [TwoFactorAuthenticationController, ChatController],
  providers: [
    PrismaService,
    TwoFactorAuthenticationService,
    ChatGateway,
    GlobalGateway,
    ChatService,
  ],
})
export class AppModule {}
