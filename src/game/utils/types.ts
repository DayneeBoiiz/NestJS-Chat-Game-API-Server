import { Socket } from 'socket.io';

export type UserInfo = {
  id: number;
  username: string;
  socket: Socket;
};
