import { Server } from 'socket.io';
import { Ball, GameTable, Paddle } from './game-table.model';
import { GameService } from '../game.service';

export const PaddleWidth = 10;
export const PaddleHeight = 100;

export const canvasHeight = 400;
export const canvasWidth = 700;

export const initialBallSpeedX = 3;
export const PADDLE_MOVE_SPEED = 15;

export const moveBall = (
  ball: Ball,
  paddle1: Paddle,
  paddle2: Paddle,
  gameTable: GameTable,
  server: Server,
  roomName: string,
  gameService: GameService,
) => {
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
    ball.speedY *= -1;
  }

  checkCollision(
    ball,
    paddle1,
    paddle2,
    gameTable,
    server,
    roomName,
    gameService,
  );
};

const checkCollision = (
  ball: Ball,
  paddle1: Paddle,
  paddle2: Paddle,
  gameTable: GameTable,
  server: Server,
  roomName: string,
  gameService: GameService,
) => {
  if (
    ball.x + ball.radius >= paddle1.x &&
    ball.x <= paddle1.x + PaddleWidth &&
    ball.y + ball.radius >= paddle1.y &&
    ball.y <= paddle1.y + PaddleHeight
  ) {
    ball.x = paddle1.x + PaddleWidth + ball.radius;
    ball.speedX *= -1;
  }

  if (
    ball.x + ball.radius >= paddle2.x &&
    ball.x <= paddle2.x + PaddleWidth &&
    ball.y + ball.radius >= paddle2.y &&
    ball.y <= paddle2.y + PaddleHeight
  ) {
    ball.x = paddle2.x - ball.radius;
    ball.speedX += 1;
    ball.speedX *= -1;
  }

  if (ball.x <= 0 || ball.x + ball.radius >= canvasWidth) {
    ball.speedX -= 1;
    ball.speedX *= -1;
  }

  if (ball.x <= 8) {
    gameTable.player2.score++;
    if (gameTable.player1.score === 5) {
      const result = {
        player1Id: gameTable.player1.id,
        player2Id: gameTable.player2.id,
        winnerId: gameTable.player2.id,
        player1Score: gameTable.player1.score,
        player2Score: gameTable.player2.score,
      };
      gameService.handleSaveGame(result);

      server.to(roomName).emit('gameEnded', {
        winner: gameTable.player1.nickname,
      });
    }
    // console.log('Player two score ', gameTable.player2.score);
    // server.to(roomName).emit('playerScored', {
    //   player2Score: gameTable.player2.score,
    //   player1Score: gameTable.player1.score,
    // });
    resetBall(ball, true);
  }

  if (ball.x + ball.radius >= canvasWidth - 8) {
    gameTable.player1.score++;
    if (gameTable.player1.score === 5) {
      const result = {
        player1Id: gameTable.player1.id,
        player2Id: gameTable.player2.id,
        winnerId: gameTable.player1.id,
        player1Score: gameTable.player1.score,
        player2Score: gameTable.player2.score,
      };
      gameService.handleSaveGame(result);

      server.to(roomName).emit('gameEnded', {
        winner: gameTable.player1.nickname,
      });
    }
    // console.log('Player one score ', gameTable.player1.score);
    // server.to(roomName).emit('playerScored', {
    //   player2Score: gameTable.player2.score,
    //   player1Score: gameTable.player1.score,
    // });
    resetBall(ball, false);
  }
};

const resetBall = (ball: Ball, isFirst: boolean) => {
  ball.x = canvasWidth / 2;
  ball.y = canvasHeight / 2;
  if (isFirst) {
    ball.speedX = initialBallSpeedX * -1;
  } else {
    ball.speedX = initialBallSpeedX;
  }
};
