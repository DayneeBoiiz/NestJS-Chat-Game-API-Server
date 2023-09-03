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
import { v4 as uuidv4 } from 'uuid';
import { GameManager, GameTable } from './utils/game-table.model';

enum PlayOption {
  PlayWithBot = 'playWithBot',
  PlayWithRandom = 'playWithRandom',
  InviteFriend = 'inviteFriend',
}

// enum Direction {
//   Up = -1,
//   Down = 1,
// }

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

  private queueRooms: string[] = [];
  private fullRooms: string[] = [];
  private playersInQueue: Set<{
    userId: number;
    nickname: string;
    socketId: string;
  }> = new Set();
  private gamesManagers: Set<{
    gameManager: GameManager;
    roomName: string;
    player1SocketId: string;
    player2SocketId: string;
  }> = new Set();

  private pendingFriendInvitations: Map<
    string,
    { userId: number; username: string; roomName: string }
  > = new Map();

  private isRoomFull(roomName: string): boolean {
    const roomExists = this.fullRooms.some((room) => room === roomName);
    if (roomExists) return true;
    else return false;
  }

  private markRoomAsFull(roomName: string): void {
    this.fullRooms.push(roomName);
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
        const availableRooms = this.queueRooms.filter(
          (room) => !this.isRoomFull(room),
        );

        if (availableRooms.length === 0) {
          const newRoom = `room-${this.queueRooms.length + 1}`;
          this.queueRooms.push(newRoom);

          client.join(newRoom);
          const playerExists = [...this.playersInQueue].some(
            (player) => player.userId === id && player.nickname === username,
          );

          if (playerExists) {
            console.log('Already in Queue');
          } else {
            this.playersInQueue.add({
              userId: id,
              nickname: username,
              socketId: client.id,
            });
          }

          this.server.to(newRoom).emit('inQueue');

          console.log(
            `Joining queue to play with a random player in room ${newRoom}`,
          );
        } else {
          const roomToJoin = availableRooms[0];
          client.join(roomToJoin);
          this.markRoomAsFull(roomToJoin);

          const playersArray = Array.from(this.playersInQueue);
          const player = playersArray.at(0);

          // console.log(this.playersInQueue);
          playersArray.shift();

          this.playersInQueue = new Set(playersArray);

          console.log(
            `Joining queue to play with a random player in room ${roomToJoin}`,
          );

          this.server.to(roomToJoin).emit('inQueue');
          setTimeout(() => {
            this.gameService.startGameWithRandom(
              id,
              username,
              client.id,
              player.userId,
              player.nickname,
              player.socketId,
              roomToJoin,
              this.server,
              this.gamesManagers,
            );
          }, 4000);
        }
        break;

      case PlayOption.InviteFriend:
        break;

      default:
        console.log('Invalid play option');
        break;
    }
  }

  handleFriendAcceptsInvitation(friendSocketId: string) {
    // Get the stored information about the invitation
    const invitationInfo = this.pendingFriendInvitations.get(friendSocketId);

    if (invitationInfo) {
      // The friend has accepted the invitation and joined the room
      const { roomName } = invitationInfo;

      // Use the Socket.IO server to emit an event to the friend's socket
      this.server
        .to(roomName)
        .emit('friendJoined', { message: 'Your friend has joined the room!' });

      // You can also remove the stored invitation information
      this.pendingFriendInvitations.delete(friendSocketId);
    }
  }

  getGameManagerByRoom(roomName: string): GameManager | undefined {
    const gameManagerEntry = Array.from(this.gamesManagers).find(
      (entry) => entry.roomName === roomName,
    );
    return gameManagerEntry ? gameManagerEntry.gameManager : undefined;
  }

  @SubscribeMessage('paddlePositionUpdate')
  handlePaddleUpdate(client: Socket, data: any) {
    const { playerId, paddlePosition, roomName } = data;
    // console.log(data);
    // this.gameService.updatePaddlePosition(playerId, paddlePosition);

    const gameManagerForRoom = this.getGameManagerByRoom(roomName);
    // console.log(gameManagerForRoom);
    // console.log(playerId);
    gameManagerForRoom.updatePaddlePosition(playerId, paddlePosition);
  }

  handleDisconnect(client: Socket) {
    this.handlePlayerDisconnect(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  handlePlayerDisconnect(disconnectedPlayerId: string) {
    const gameManagerEntry = [...this.gamesManagers].find(
      (entry) =>
        entry.player1SocketId === disconnectedPlayerId ||
        entry.player2SocketId === disconnectedPlayerId,
    );

    if (gameManagerEntry) {
      const { gameManager } = gameManagerEntry;

      // console.log(gameManager);
      gameManager.handlePlayerDisconnect(disconnectedPlayerId);
      this.gamesManagers.delete(gameManagerEntry);
    }
  }
}
