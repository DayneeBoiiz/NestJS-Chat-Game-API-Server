import { Injectable } from '@nestjs/common';
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

  constructor(private prisma: PrismaService) {
    this.gameManager = new GameManager(this.server);
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

  addUserToQueue(
    id: number,
    nickname: string,
    socketId: string,
    playOption: PlayOption,
    server: Server,
  ) {
    if (this.userIdSet.has(id)) {
      // User is already in the queue, handle accordingly
      return;
    }

    const userInfo: any = { id, nickname, socketId };
    this.usersQueue.push(userInfo);
    this.userIdSet.add(id);

    if (playOption === PlayOption.PlayWithBot) {
      // Handle Play with Bot option here, like emitting a 'queuedForBot' event
      server.to('hello').emit('queuedForBot', {
        message: 'Waiting to play with a bot...',
      });

      // Set a timeout to remove the user from queue after a certain time
      setTimeout(() => {
        this.removeFromQueue(id);
        server.to('hello').emit('gameStarted');
      }, 2000);
    } else if (playOption === PlayOption.PlayWithRandom) {
      // Handle Play with Random option here, wait for more players or start game
      if (this.usersQueue.length >= 2) {
        server.to('hello').emit('inQueue');
        setTimeout(() => {
          this.startGame(server, id);
        }, 2000);
      } else {
        server.to('hello').emit('inQueue', {
          message: 'Waiting for another player to join...',
        });
      }
    } else if (playOption === PlayOption.InviteFriend) {
      // Handle Invite Friend option here, maybe emit an 'invitingFriend' event
      // ... handle inviting a friend logic
    }
  }

  private startGame(server: Server, playerId: number) {
    this.gameManager.startGame(this.usersQueue, server, playerId); // Use GameManager to start the game

    // Two users are in the queue, emit 'gameStarted' event
    // const players = this.usersQueue.splice(0, 2);
    // const gameTable = new GameTable();
    // gameTable.player1 = players[0];
    // gameTable.player2 = players[1];
    // gameTable.player1.paddle = new Paddle(10, 150);
    // gameTable.player2.paddle = new Paddle(680, 150);

    // setInterval(() => {
    //   moveBall(gameTable.ball);
    //   server.to('hello').emit('BallPositionUpdated', {
    //     ball: {
    //       x: gameTable.ball.x,
    //       y: gameTable.ball.y,
    //     },
    //     firstPaddle: {
    //       playerId: gameTable.player1.id,
    //       x: gameTable.player1.paddle.x,
    //       y: gameTable.player1.paddle.y,
    //     },
    //     secondPaddle: {
    //       playerId: gameTable.player2.id,
    //       x: gameTable.player2.paddle.x,
    //       y: gameTable.player2.paddle.y,
    //     },
    //   });
    // }, 16);

    // server.to('hello').emit('gameStarted', gameTable);
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
}
