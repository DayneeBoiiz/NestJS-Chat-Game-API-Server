import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { GameService } from './game.service';
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';
import { Result } from 'src/auth/utils/types';
// import { GlobalGateway } from 'src/global/global.gateway';

@UseGuards(JwtBlacklistGuard)
@UseGuards(JwtGuard)
@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get('my-games')
  async handleGetMyGames(@GetUser() user: User) {
    try {
      return await this.gameService.handleGetMyGames(user.id);
    } catch (error) {
      console.log(error);
    }
  }
}
