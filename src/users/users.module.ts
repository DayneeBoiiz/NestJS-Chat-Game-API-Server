import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
// import { GlobalModule } from 'src/global/global.module';
import { CoreModule } from 'src/core/core.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
    CoreModule,
  ],
  providers: [UsersService, JwtBlacklistGuard],
  controllers: [UsersController],
})
export class UsersModule {}
