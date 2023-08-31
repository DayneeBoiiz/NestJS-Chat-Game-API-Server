import { Server, Socket } from 'socket.io';
import {
  PADDLE_MOVE_SPEED,
  PaddleHeight,
  PaddleWidth,
  canvasHeight,
  canvasWidth,
  moveBall,
} from './game_functions';

interface IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  // paddle: string;
}

export class Ball {
  x!: number;
  y!: number;
  speed: number;
  radius: number;
  speedX: number;
  speedY: number;

  increaseSpeed() {
    this.speed += 1;
    this.speedX = Math.sign(this.speedX) * this.speed;
    this.speedY = Math.sign(this.speedY) * this.speed;
  }

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = Math.PI * 2;
    this.speed = 3;
    this.speedX = 3;
    this.speedY = 2;
  }
}

export class Paddle {
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  // dy!: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 100;
    // this.dy = 0;
  }
}

export class Player implements IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  paddle: Paddle | null;
  score: number;

  constructor(userId: number, nickname: string, socketId: string) {
    this.id = userId;
    this.nickname = nickname;
    this.socketId = socketId;
    this.paddle = null;
    this.score = 0;
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

export class GameManager {
  private gameTable: GameTable;
  private server: Server;
  private playerId: number;

  constructor(server: Server) {
    this.gameTable = new GameTable();
    this.server = server;
  }

  startGame(players: Player[], server: Server, playerId: number) {
    this.gameTable.player1 = players[0];
    this.gameTable.player2 = players[1];
    this.gameTable.player1.paddle = new Paddle(10, 150);
    this.gameTable.player2.paddle = new Paddle(680, 150);

    setInterval(() => {
      moveBall(
        this.gameTable.ball,
        this.gameTable.player1.paddle,
        this.gameTable.player2.paddle,
      );
      server.to('hello').emit('BallPositionUpdated', {
        ball: {
          x: this.gameTable.ball.x,
          y: this.gameTable.ball.y,
        },
        playerId: playerId,
        y: this.gameTable.player1.paddle.y,
        secondPaddle: {
          y: this.gameTable.player2.paddle.y,
        },
        PaddleWidth: this.gameTable.player1.paddle.width,
        PaddleHeight: this.gameTable.player1.paddle.height,
      });
    }, 16);

    server.to('hello').emit('gameStarted', this.gameTable);
  }

  updatePaddlePosition(playerId: number, paddlePosition: number) {
    const player: Player =
      this.gameTable.player1.id === playerId
        ? this.gameTable.player1
        : this.gameTable.player2;

    if (player.paddle) {
      const targetY = player.paddle.y + paddlePosition * PADDLE_MOVE_SPEED;

      if (targetY < 0) {
        player.paddle.y = 0;
      } else if (targetY + PaddleHeight > canvasHeight) {
        player.paddle.y = canvasHeight - PaddleHeight;
      } else {
        player.paddle.y = targetY;
      }
    }
  }

  private updateClients() {
    // Emit updated game state to clients
    this.server.to('hello').emit('gameStateUpdated', {
      ball: {
        x: this.gameTable.ball.x,
        y: this.gameTable.ball.y,
      },
      player1: {
        id: this.gameTable.player1.id,
        paddle: {
          x: this.gameTable.player1.paddle.x,
          y: this.gameTable.player1.paddle.y,
        },
      },
      player2: {
        id: this.gameTable.player2.id,
        paddle: {
          x: this.gameTable.player2.paddle.x,
          y: this.gameTable.player2.paddle.y,
        },
      },
    });
  }

  // Other methods for handling game actions and events
}
