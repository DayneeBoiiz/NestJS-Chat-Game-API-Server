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
  namespace: 'core',
  cors: {
    origin: 'http://10.30.153.186:3000',
    credentials: true,
  },
})
export class CoreGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    console.log(`Client connected to CoreGateway: ${client.id}`);
    // const user = client.handshake.query;
    // const userId = user.id;
    // this.userService.addSocket(userId as string, client);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected from CoreGatway: ${client.id}`);
    // const user = client.handshake.query;
    // const userId = user.id;
    // this.userService.removeSocket(userId as string, client);
  }

  // @SubscribeMessage('send-invite')
  // async handeSendInvite(client: Socket, data: any) {
  //   const { recipientId, sender } = data;
  //   this.userService.sendInvite(recipientId, sender);
  // }
}