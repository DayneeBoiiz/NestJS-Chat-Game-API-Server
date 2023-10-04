import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfo } from './utils/types';
import { Server, Socket } from 'socket.io';
import { GameManager, Player } from './utils/game-table.model';
import { Result } from 'src/auth/utils/types';
import { UsersService } from 'src/users/users.service';

enum PlayOption {
  PlayWithBot = 'playWithBot',
  PlayWithRandom = 'playWithRandom',
  InviteFriend = 'inviteFriend',
}

@Injectable()
export class GameService {
  private readonly usersQueue: Player[] = [];
  private readonly userIdSet: Set<number> = new Set<number>();
  private gameManager: GameManager;
  private server: Server;

  constructor(
    private prisma: PrismaService,
    private userService: UsersService,
  ) {
    this.gameManager = new GameManager(this.server, this);
  }

  initServer(server: Server) {
    this.server = server;
  }

  startGameWithRandom(
    player2Id: number,
    player2Username: string,
    player2Socketid: string,
    player1Id: number,
    player1Username: string,
    player1SocketId: string,
    roomName: string,
    server: Server,
    gameManagers: Set<{
      gameManager: GameManager;
      roomName: string;
      player1SocketId: string;
      player2SocketId: string;
    }>,
  ) {
    const player1 = new Player(player1Id, player1Username, player1SocketId);
    const player2 = new Player(player2Id, player2Username, player2Socketid);

    const players = [player1, player2];
    const gameManager = new GameManager(server, this);

    gameManagers.add({
      gameManager,
      roomName,
      player1SocketId: player1.socketId,
      player2SocketId: player2.socketId,
    });

    this.userService.ongameStats(player1.id);
    this.userService.ongameStats(player2.id);

    gameManager.startGame(players, server, player1Id, roomName);
  }

  updatePaddlePosition(playerId: number, paddlePosition: number) {
    this.gameManager.updatePaddlePosition(playerId, paddlePosition);
  }

  async handleSaveGame(result: Result) {
    try {
      const match = await this.prisma.match.create({
        data: {
          winnerId: result.winnerId,
          player1Id: result.player1Id,
          player2Id: result.player2Id,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
        },
      });

      if (!match) {
        throw new Error('Error while saving the game');
      }

      return match;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  setOnline(player1Id: number, player2Id: number) {
    this.userService.onlineState(player1Id);
    this.userService.onlineState(player2Id);
  }

  async handleGetMyGames(userID: number) {
    try {
      const userMatches = await this.prisma.match.findMany({
        where: {
          OR: [{ player1Id: userID }, { player2Id: userID }],
        },
        include: {
          winner: true,
          player1: true,
          player2: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const winCount = userMatches.reduce((count, match) => {
        if (match.winnerId === userID) {
          return count + 1;
        }
        return count;
      }, 0);

      return { matches: userMatches, winCount };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async handleGetLeaderboard() {
    try {
      const leaderboard = await this.prisma.user.findMany({
        include: {
          matchesAsWinner: true,
        },
      });

      const usersWithWins = leaderboard.map((user) => ({
        ...user,
        wins: user.matchesAsWinner.length,
      }));

      const sortedLeaderboard = usersWithWins.sort((a, b) => b.wins - a.wins);

      return sortedLeaderboard;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
