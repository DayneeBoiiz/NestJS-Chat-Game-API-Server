import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserInfo } from './utils/types';
import { GameService } from './game.service';

enum PlayOption {
  PlayWithBot = 'playWithBot',
  PlayWithRandom = 'playWithRandom',
  InviteFriend = 'inviteFriend',
}

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private gameService: GameService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // console.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected to the game Lobby: ${client.id}`);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(
    client: Socket,
    data: { id: number; username: string; playOption: PlayOption },
  ) {
    const { id, username, playOption } = data;

    switch (playOption) {
      case PlayOption.PlayWithBot:
        this.gameService.addUserToQueue(
          id,
          username,
          client.id,
          playOption,
          this.server,
        );
        console.log('Joining queue to play with a bot');
        break;

      case PlayOption.PlayWithRandom:
        client.join('hello');
        console.log('Joining queue to play with a random player');
        this.gameService.addUserToQueue(
          id,
          username,
          client.id,
          playOption,
          this.server,
        );
        break;

      case PlayOption.InviteFriend:
        console.log('Joining queue to invite a friend');
        break;

      default:
        console.log('Invalid play option');
        break;
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
