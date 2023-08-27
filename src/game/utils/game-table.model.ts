import { Socket } from 'socket.io';

interface IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  // paddle: string;
}

export class Player implements IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  // paddle: string;

  constructor(
    userId: number,
    nickname: string,
    socketId: string,
    // paddle: string,
  ) {
    this.id = userId;
    this.nickname = nickname;
    this.socketId = socketId;
    // this.paddle = paddle;
  }
}

export class GameTable {
  player1: Player | null = null;
  player2: Player | null = null;
}
