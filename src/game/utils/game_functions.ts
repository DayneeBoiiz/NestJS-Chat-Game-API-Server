import { Ball } from './game-table.model';

const PaddleWidth = 10;
const PaddleHeight = 100;

const canvasHeight = 400;
const canvasWidth = 700;

// const moveBall = (ball: Ball) => {
//   ball.x += ball.speedX;
//   ball.y += ball.speedY;

//   // Check if the ball hits the top or bottom boundaries
//   if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
//     ball.speedY *= -1; // Reverse the vertical direction
//   }

//   // Check collision with paddles and canvas boundaries
//   check_collision(ball);
// };

const check_collision = (ball: Ball) => {
  // Check collision with left paddle
  if (
    ball.x <= PaddleWidth + PaddleWidth &&
    ball.y >= canvasHeight / 2 - PaddleHeight / 2 &&
    ball.y <= canvasHeight / 2 - PaddleHeight / 2 + PaddleHeight
  ) {
    // Ball hit the left paddle, change direction
    ball.speedX *= -1;
  }

  // Check collision with right paddle
  if (
    ball.x + ball.radius >= canvasWidth - PaddleWidth - 10 &&
    ball.y >= canvasHeight / 2 - PaddleHeight / 2 &&
    ball.y <= canvasHeight / 2 - PaddleHeight / 2 + PaddleHeight
  ) {
    // Ball hit the right paddle, change direction
    ball.speedX *= -1;
  }

  // Check if the ball scored on the left side (player 2 scores)
  if (ball.x <= 0) {
    // Handle scoring logic here, e.g., increase player 2's score
    resetBall(ball);
  }

  // Check if the ball scored on the right side (player 1 scores)
  if (ball.x + ball.radius >= canvasWidth) {
    // Handle scoring logic here, e.g., increase player 1's score
    resetBall(ball);
  }
};

const resetBall = (ball: Ball) => {
  // Reset the ball's position to the center
  ball.x = canvasWidth / 2;
  ball.y = canvasHeight / 2;
  //   ball.speedX = initialBallSpeedX; // Reset ball's speed
  //   ball.speedY = initialBallSpeedY;
};
