import { Server, Socket } from 'socket.io';
import {
  PADDLE_MOVE_SPEED,
  PaddleHeight,
  canvasHeight,
  moveBall,
} from './game_functions';
import { Inject, Injectable } from '@nestjs/common';
import { GameService } from '../game.service';

interface IPlayer {
  id: number;
  nickname: string;
  socketId: string;
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

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.width = 10;
    this.height = 100;
  }
}

export class Player implements IPlayer {
  id: number;
  nickname: string;
  paddle: Paddle | null;
  score: number;
  socketId: string;

  constructor(userId: number, nickname: string, socketId: string) {
    this.id = userId;
    this.nickname = nickname;
    this.paddle = null;
    this.score = 0;
    this.socketId = socketId;
  }
}

export class GameTable {
  player1: Player | null = null;
  player2: Player | null = null;
  ball: Ball;
  roomName: string;

  constructor() {
    this.ball = new Ball(350, 200);
  }
}

@Injectable()
export class GameManager {
  private gameTable: GameTable;
  private server: Server;
  private playerId: number;
  private socketToUserIdMap = new Map();
  private active = true;

  constructor(
    server: Server,
    @Inject(GameService) private readonly gameService: GameService,
  ) {
    this.server = server;

    this.gameTable = new GameTable();
  }

  startGame(
    players: Player[],
    server: Server,
    playerId: number,
    roomName: string,
  ) {
    this.gameTable.player1 = players[0];
    this.gameTable.player2 = players[1];
    this.gameTable.player1.paddle = new Paddle(10, 150);
    this.gameTable.player2.paddle = new Paddle(680, 150);
    this.gameTable.player1.score = 0;
    this.gameTable.player2.score = 0;
    this.gameTable.roomName = roomName;

    setTimeout(() => {
      const gameInterval = setInterval(() => {
        moveBall(
          this.gameTable.ball,
          this.gameTable.player1.paddle,
          this.gameTable.player2.paddle,
          this.gameTable,
          server,
          roomName,
          this.gameService,
        );

        server.to(roomName).emit('playerScored', {
          player2Score: this.gameTable.player2.score,
          player1Score: this.gameTable.player1.score,
        });

        server.to(roomName).emit('BallPositionUpdated', {
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

        if (
          this.gameTable.player1.score === 5 ||
          this.gameTable.player2.score === 5
        ) {
          if (gameInterval) {
            clearInterval(gameInterval);
          }
        }
      }, 16);
    }, 4000);

    server.to(roomName).emit('gameStarted', this.gameTable);
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

  handlePlayerDisconnect(disconnectedPlayerId: string) {
    const connectedPlayer =
      this.gameTable.player1.socketId === disconnectedPlayerId
        ? this.gameTable.player2
        : this.gameTable.player1;

    this.gameService.setOnline(
      this.gameTable.player1.id,
      this.gameTable.player2.id,
    );

    this.server.to(this.gameTable.roomName).emit('gameEnded', {
      winner: connectedPlayer.nickname,
    });
  }
}
