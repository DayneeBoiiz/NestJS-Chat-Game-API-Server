import { Socket } from 'socket.io';

interface IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  // paddle: string;
}

export class Ball {
  x!: number;
  y!: number;
  radius: number;
  speedX: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = Math.PI * 2;
    this.speedX = 1;
  }

  // update(paddle1: Paddle, paddle2: Paddle) {
  //   this.x += this.dx;
  //   this.y += this.dy;

  //   if (this.y + this.radius > this.canvas.height || this.y - this.radius < 0) {
  //     this.dy = -this.dy;
  //   }

  //   if (
  //     this.x - this.radius < paddle1.x + paddle1.width &&
  //     this.y + this.radius > paddle1.y &&
  //     this.y - this.radius < paddle1.y + paddle1.height
  //   ) {
  //     this.dx = -this.dx;
  //   }

  //   if (
  //     this.x + this.radius > paddle2.x &&
  //     this.y + this.radius > paddle2.y &&
  //     this.y - this.radius < paddle2.y + paddle2.height
  //   ) {
  //     this.dx = -this.dx;
  //   }

  //   if (this.x - this.radius < 0 || this.x + this.radius > this.canvas.width) {
  //     this.x = this.canvas.width / 2;
  //     this.y = this.canvas.height / 2;
  //     this.dx = -this.dx;
  //   }
  // }
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
  ball: Ball;

  constructor() {
    this.ball = new Ball(350, 200);
  }
}
