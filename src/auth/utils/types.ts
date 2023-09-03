export type UserDetails = {
  email: string;
  login: string;
  avatrURL: string;
};

export interface Result {
  player1Id: number;
  player2Id: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
}
