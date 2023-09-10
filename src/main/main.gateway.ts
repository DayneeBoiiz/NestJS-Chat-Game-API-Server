import { Inject, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';

@WebSocketGateway({
  namespace: 'main',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class MainGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    console.log(`Client connected to MainGatway: ${client.id}`);
    const user = client.handshake.query;
    const userId = user.id;
    this.userService.addSocket(userId as string, client);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected from MainGatway: ${client.id}`);
    const user = client.handshake.query;
    const userId = user.id;
    this.userService.removeSocket(userId as string, client);
  }

  @SubscribeMessage('send-invite')
  async handeSendInvite(client: Socket, data: any) {
    try {
      const { recipientId, sender } = data;
      this.userService.sendInvite(recipientId, sender);
    } catch (error) {
      console.log(error);
    }
  }

  @SubscribeMessage('accept-invite')
  async handleAcceptInvite(client: Socket, data: any) {
    const { player1, player2 } = data;
    this.userService.handleAcceptInvite(player1, player2);
  }
}
