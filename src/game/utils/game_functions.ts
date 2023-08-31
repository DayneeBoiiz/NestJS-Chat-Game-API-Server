import { Ball, Paddle } from './game-table.model';

export const PaddleWidth = 20;
export const PaddleHeight = 200;

export const canvasHeight = 400;
export const canvasWidth = 700;

export const initialBallSpeedX = 3;

export const moveBall = (ball: Ball, paddle1: Paddle, paddle2: Paddle) => {
  ball.x += ball.speedX;
  ball.y += ball.speedY;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
    ball.speedY *= -1;
  }

  checkCollision(ball, paddle1, paddle2);
};

const checkCollision = (ball: Ball, paddle1: Paddle, paddle2: Paddle) => {
  console.log(paddle1);
  console.log(paddle2);
  if (
    ball.x + ball.radius >= paddle1.x &&
    ball.x + ball.radius <= paddle1.x + PaddleWidth &&
    ball.y >= paddle1.y + PaddleWidth &&
    ball.y <= paddle1.y + PaddleHeight
  ) {
    ball.speedX -= 1;
    // ball.speedY += 1;
    console.log(ball.speedX);
    ball.speedX *= -1;
  }

  if (
    ball.x + ball.radius >= paddle2.x &&
    ball.x + ball.radius <= paddle2.x + PaddleWidth &&
    ball.y >= paddle2.y + PaddleWidth &&
    ball.y <= paddle2.y + PaddleHeight
  ) {
    ball.speedX += 1;
    // ball.speedY += 1;
    console.log(ball.speedX);
    ball.speedX *= -1;
  }

  if (ball.x <= 0) {
    resetBall(ball);
  }

  if (ball.x + ball.radius >= canvasWidth) {
    resetBall(ball);
  }
};

const resetBall = (ball: Ball) => {
  ball.x = canvasWidth / 2;
  ball.y = canvasHeight / 2;
  ball.speedX = initialBallSpeedX * -1; // Reset ball's speed
  //   ball.speedY = initialBallSpeedY;
};
