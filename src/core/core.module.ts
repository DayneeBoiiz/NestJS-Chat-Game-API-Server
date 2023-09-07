import { Module } from '@nestjs/common';
import { CoreGateway } from './core.gateway';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  providers: [CoreGateway, UsersService, JwtService],
  exports: [CoreGateway],
})
export class CoreModule {}
