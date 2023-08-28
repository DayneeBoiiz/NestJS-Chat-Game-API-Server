import { Server, Socket } from 'socket.io';
import {
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
  radius: number;
  speedX: number;
  speedY: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = Math.PI * 2;
    this.speedX = 3; // Speed in the horizontal direction
    this.speedY = 2;
  }
}

export class Paddle {
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  dy!: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = PaddleWidth;
    this.height = PaddleHeight;
    this.dy = 0;
  }
}

export class Player implements IPlayer {
  id: number;
  nickname: string;
  socketId: string;
  paddle: Paddle | null;

  constructor(userId: number, nickname: string, socketId: string) {
    this.id = userId;
    this.nickname = nickname;
    this.socketId = socketId;
    this.paddle = null;
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

  constructor(server: Server) {
    this.gameTable = new GameTable();
    this.server = server;
  }

  startGame(players: Player[], server: Server) {
    this.gameTable.player1 = players[0];
    this.gameTable.player2 = players[1];
    this.gameTable.player1.paddle = new Paddle(10, 150);
    this.gameTable.player2.paddle = new Paddle(680, 150);

    setInterval(() => {
      moveBall(this.gameTable.ball);
      server.to('hello').emit('BallPositionUpdated', {
        ball: {
          x: this.gameTable.ball.x,
          y: this.gameTable.ball.y,
        },
        firstPaddle: {
          playerId: this.gameTable.player1.id,
          x: this.gameTable.player1.paddle.x,
          y: this.gameTable.player1.paddle.y,
        },
        secondPaddle: {
          playerId: this.gameTable.player2.id,
          x: this.gameTable.player2.paddle.x,
          y: this.gameTable.player2.paddle.y,
        },
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
      // Assuming that paddlePosition is 1 to move down and -1 to move up
      if (paddlePosition === 1) {
        // Move the paddle down
        player.paddle.y += 5;
      } else if (paddlePosition === -1) {
        // Move the paddle up
        player.paddle.y -= 5;
      }

      // Ensure the paddle stays within the canvas boundaries
      if (player.paddle.y < 0) {
        player.paddle.y = 0;
      } else if (player.paddle.y + PaddleHeight > canvasHeight) {
        player.paddle.y = 5 - PaddleHeight;
      }
    }
  }

  // private moveBall() {
  //   // Logic to move the ball
  // }

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
