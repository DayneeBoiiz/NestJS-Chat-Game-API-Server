import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserInfo } from './utils/types';
import { Socket } from 'socket.io';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  private readonly usersQueue: UserInfo[] = [];
  private readonly userIdSet: Set<number> = new Set<number>();

  addUserToQueue(id: number, username: string, socket: Socket) {
    if (this.userIdSet.has(id)) {
      // User is already in the queue, handle accordingly
      return;
    }

    const userInfo: UserInfo = { id, username, socket };
    this.usersQueue.push(userInfo);
    this.userIdSet.add(id);
    console.log('InQueue');

    if (this.usersQueue.length >= 2) {
      // Two users are in the queue, emit 'gameStarted' event
      const players = this.usersQueue.splice(0, 2);
      players.forEach((player) => {
        player.socket.emit('gameStarted', {
          message: 'Game is starting!',
          data: player.username,
        });
        this.userIdSet.delete(player.id); // Remove user ID from userIdSet
      });
    } else {
      // One user is in the queue, emit 'inQueue' event
      socket.emit('inQueue', {
        message: 'Waiting for another player to join...',
        data: socket.data,
      });
      console.log(this.usersQueue);
    }
  }
}
