import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { MainGateway } from './main.gateway';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule, JwtModule],
  providers: [UsersService, JwtService, MainGateway],
  exports: [MainGateway],
})
export class MainModule {}
