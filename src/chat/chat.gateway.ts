// import { UseGuards } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: true,
  },
  Credential: true,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket, ...args: any[]) {}
  async handleDisconnect(client: Socket) {}

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, data: any) {
    const { conversationId } = data;

    client.join(conversationId);
  }
}
