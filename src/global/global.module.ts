import { Module } from '@nestjs/common';
import { GlobalGateway } from './global.gateway';
import { GlobalService } from './global.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  providers: [GlobalGateway, GlobalService, UsersService, JwtService],
  exports: [GlobalGateway],
})
export class GlobalModule {}
