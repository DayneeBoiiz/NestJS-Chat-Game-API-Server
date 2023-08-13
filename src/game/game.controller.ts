import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { GameService } from './game.service';
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';

@UseGuards(JwtBlacklistGuard)
@UseGuards(JwtGuard)
@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}
}
