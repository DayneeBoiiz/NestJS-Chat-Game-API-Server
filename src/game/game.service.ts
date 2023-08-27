import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfo } from './utils/types';
import { Server, Socket } from 'socket.io';
import { GameTable, Player } from './utils/game-table.model';

enum PlayOption {
  PlayWithBot = 'playWithBot',
  PlayWithRandom = 'playWithRandom',
  InviteFriend = 'inviteFriend',
}

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  private readonly usersQueue: Player[] = [];
  private readonly userIdSet: Set<number> = new Set<number>();

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

    const userInfo: Player = { id, nickname, socketId };
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
          this.startGame(server);
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

  private startGame(server: Server) {
    // Two users are in the queue, emit 'gameStarted' event
    const players = this.usersQueue.splice(0, 2);
    const gameTable = new GameTable();
    gameTable.player1 = players[0];
    gameTable.player2 = players[1];

    server.to('hello').emit('gameStarted', gameTable);

    // players.forEach((player, index) => {
    //   // if (index === 1) {
    //   //   player.socket.emit('flipCanvas', true);
    //   // }
    //   console.log('object', gameTable);
    //   player.socket.emit('gameStarted', {
    //     username: 'Hello',
    //     player1: gameTable.player1,
    //     player2: gameTable.player2,
    //   });
    //   this.userIdSet.delete(player.userId); // Remove user ID from userIdSet
    // });
  }

  private removeFromQueue(id: number) {
    const index = this.usersQueue.findIndex((user) => user.id === id);
    if (index !== -1) {
      this.usersQueue.splice(index, 1);
      this.userIdSet.delete(id);
      console.log('User removed from queue:', id);
    }
  }
}
