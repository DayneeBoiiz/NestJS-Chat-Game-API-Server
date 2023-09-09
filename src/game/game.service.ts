import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfo } from './utils/types';
import { Server, Socket } from 'socket.io';
import {
  Ball,
  GameManager,
  GameTable,
  Paddle,
  Player,
} from './utils/game-table.model';
import { moveBall } from './utils/game_functions';
import { Result } from 'src/auth/utils/types';
// import { GlobalGateway } from 'src/global/global.gateway';
import Pusher from 'pusher';
import { CoreGateway } from 'src/core/core.gateway';
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
    @Inject(forwardRef(() => CoreGateway))
    private readonly globalGatway: CoreGateway,
    private userService: UsersService,
    @Inject('PUSHER') private readonly pusher: Pusher,
  ) {
    this.gameManager = new GameManager(this.server, this);
  }

  initServer(server: Server) {
    this.server = server;
  }

  // addUserToQueue(id: number, username: string, socket: Socket) {
  //   if (this.userIdSet.has(id)) {
  //     // User is already in the queue, handle accordingly
  //     return;
  //   }

  //   const userInfo: UserInfo = { id, username, socket };
  //   this.usersQueue.push(userInfo);
  //   this.userIdSet.add(id);
  //   console.log('InQueue');

  //   if (this.usersQueue.length >= 2) {
  //     // Two users are in the queue, emit 'gameStarted' event
  //     const players = this.usersQueue.splice(0, 2);
  //     players.forEach((player) => {
  //       player.socket.emit('gameStarted', {
  //         message: 'Game is starting!',
  //         data: player.username,
  //       });
  //       this.userIdSet.delete(player.id); // Remove user ID from userIdSet
  //     });
  //   } else {
  //     // One user is in the queue, emit 'inQueue' event
  //     socket.emit('inQueue', {
  //       message: 'Waiting for another player to join...',
  //       data: socket.data,
  //     });
  //     console.log(this.usersQueue);
  //   }
  // }

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

    // console.log(player1);
    // console.log(player2);
    // console.log(roomName);

    const players = [player1, player2];
    const gameManager = new GameManager(server, this);

    gameManagers.add({
      gameManager,
      roomName,
      player1SocketId: player1.socketId,
      player2SocketId: player2.socketId,
    });

    // console.log(gameManager);

    // server.to(roomName).emit('gameStarted');

    this.userService.ongameStats(player1.id);
    this.userService.ongameStats(player2.id);

    gameManager.startGame(players, server, player1Id, roomName);
  }

  // addUserToQueue(
  //   id: number,
  //   nickname: string,
  //   socketId: string,
  //   playOption: PlayOption,
  //   server: Server,
  // ) {
  //   if (this.userIdSet.has(id)) {
  //     // User is already in the queue, handle accordingly
  //     return;
  //   }

  //   const userInfo: any = { id, nickname, socketId };
  //   this.usersQueue.push(userInfo);
  //   this.userIdSet.add(id);

  //   if (playOption === PlayOption.PlayWithBot) {
  //     // Handle Play with Bot option here, like emitting a 'queuedForBot' event
  //     server.to('hello').emit('queuedForBot', {
  //       message: 'Waiting to play with a bot...',
  //     });

  //     // Set a timeout to remove the user from queue after a certain time
  //     setTimeout(() => {
  //       this.removeFromQueue(id);
  //       server.to('hello').emit('gameStarted');
  //     }, 2000);
  //   } else if (playOption === PlayOption.PlayWithRandom) {
  //     // Handle Play with Random option here, wait for more players or start game
  //     if (this.usersQueue.length >= 2) {
  //       server.to('hello').emit('inQueue');
  //       setTimeout(() => {
  //         this.startGame(server, id);
  //       }, 2000);
  //     } else {
  //       server.to('hello').emit('inQueue', {
  //         message: 'Waiting for another player to join...',
  //       });
  //     }
  //   } else if (playOption === PlayOption.InviteFriend) {
  //     // Handle Invite Friend option here, maybe emit an 'invitingFriend' event
  //     // ... handle inviting a friend logic
  //   }
  // }

  private startGame(server: Server, playerId: number) {
    // this.gameManager.startGame(this.usersQueue, server, playerId); // Use GameManager to start the game
  }

  private removeFromQueue(id: number) {
    const index = this.usersQueue.findIndex((user) => user.id === id);
    if (index !== -1) {
      this.usersQueue.splice(index, 1);
      this.userIdSet.delete(id);
      console.log('User removed from queue:', id);
    }
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
      console.log(error);
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
      });

      const winCount = userMatches.reduce((count, match) => {
        if (match.winnerId === userID) {
          return count + 1;
        }
        return count;
      }, 0);

      return { matches: userMatches, winCount };
    } catch (error) {
      console.log(error);
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
      console.log(error);
    }
  }
}
