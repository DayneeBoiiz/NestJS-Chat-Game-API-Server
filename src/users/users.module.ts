import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { MainModule } from 'src/main/main.module';
import { MainGateway } from 'src/main/main.gateway';
// import { GlobalModule } from 'src/global/global.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [UsersService, JwtBlacklistGuard, MainGateway],
  controllers: [UsersController],
})
export class UsersModule {}
