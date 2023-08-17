import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { GlobalModule } from 'src/global/global.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    GlobalModule,
  ],
  providers: [UsersService, JwtBlacklistGuard],
  controllers: [UsersController],
})
export class UsersModule {}
