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

enum Direction {
  Up = -1,
  Down = 1,
}

@WebSocketGateway({ namespace: 'game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private gameService: GameService) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.gameService.initServer(server);
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

  @SubscribeMessage('paddlePositionUpdate')
  handlePaddleUpdate(client: Socket, data: any) {
    const { playerId, paddlePosition } = data;

    // console.log(data);
    const roomName = 'hello'; // Assuming the room name is 'hello'
    this.gameService.updatePaddlePosition(playerId, paddlePosition);
    // this.server.to(roomName).emit('paddlePositionUpdate', {
    //   playerId: playerId,
    //   paddlePosition: paddlePosition,
    //   paddle: playerId === 1 ? 'left' : 'right', // Assuming player 1 is on the left and player 2 is on the right
    // });
  }

  @SubscribeMessage('paddlePositionStop')
  handlePaddleStop(client: Socket, data: any) {
    const { playerId } = data;

    const roomName = 'hello'; // Assuming room name is 'hello'

    this.server.to(roomName).emit('paddlePositionStop', {
      playerId: playerId,
      // paddle: playerId === 1 ? 'left' : 'right', // Assuming player 1 is on the left and player 2 is on the right
    });
  }

  @SubscribeMessage('ballPositionUpdate')
  handleBallUpdate(
    client: Socket,
    data: { x: number; y: number; playerId: number },
  ) {
    client.to('hello').emit('opponentBallPositionUpdated', data);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
