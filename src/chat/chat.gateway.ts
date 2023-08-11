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

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  userID: any;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    this.userID = await this.chatService.extractUserId(client);
    console.log(`Client connected: ${client.id}`);
  }
  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // @SubscribeMessage('createRoom')
  // async handleCreateRoom(client: Socket, roomName: string) {
  //   await this.chatService.handleCreateRoom(client, roomName, this.userID);
  // }

  // @SubscribeMessage('leaveRoom')
  // async handleLeaveRoom(client: Socket, roomId: string) {
  //   await this.chatService.handleLeaveRoom(client, roomId, this.userID);
  // }

  @SubscribeMessage('deleteRoom')
  async handleDeleteRoom(client: Socket, roomId: string) {
    await this.chatService.handleDeleteRoom(client, roomId, this.server);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, roomId: string) {
    this.userID = await this.chatService.extractUserId(client);
    await this.chatService.handleJoinRoom(client, roomId, this.userID);
  }

  // @SubscribeMessage('sendMessage')
  // async handleSendMessage(
  //   client: Socket,
  //   data: { roomId: string; message: string },
  // ) {
  //   await this.chatService.handleSendMessage(
  //     client,
  //     data.roomId,
  //     data.message,
  //     this.userID,
  //     this.server,
  //   );
  // }

  @SubscribeMessage('sendDirectMessage')
  async handleSendDirectMessage(
    client: Socket,
    data: { recieverID: string; message: string },
  ) {
    console.log(data.recieverID);
    console.log(data.message);
  }
}
