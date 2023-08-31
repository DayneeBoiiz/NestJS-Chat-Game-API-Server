import { Ball, Paddle } from './game-table.model';

export const PaddleWidth = 10;
export const PaddleHeight = 100;

export const canvasHeight = 400;
export const canvasWidth = 700;

export const initialBallSpeedX = 3;
export const PADDLE_MOVE_SPEED = 10;

export const moveBall = (ball: Ball, paddle1: Paddle, paddle2: Paddle) => {
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
    ball.speedY *= -1;
  }

  checkCollision(ball, paddle1, paddle2);
};

const checkCollision = (ball: Ball, paddle1: Paddle, paddle2: Paddle) => {
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
    ball.speedX *= -1;
  }

  if (ball.x <= 0 || ball.x + ball.radius >= canvasWidth) {
    ball.speedX *= -1;
  }

  if (ball.x <= 8) {
    resetBall(ball, true);
  }

  if (ball.x + ball.radius >= canvasWidth - 8) {
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
