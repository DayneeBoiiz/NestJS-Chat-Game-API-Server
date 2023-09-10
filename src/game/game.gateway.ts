import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { v4 as uuidv4 } from 'uuid';
import { GameManager, GameTable } from './utils/game-table.model';

enum PlayOption {
  PlayWithRandom = 'playWithRandom',
  privateGame = 'privateGame',
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

  private privateGameQueue = new Map<
    string,
    { id: number; username: string; socketId: string }
  >();

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
    data: {
      id: number;
      username: string;
      playOption: PlayOption;
      roomName?: string;
    },
  ) {
    const { id, username, playOption, roomName } = data;

    switch (playOption) {
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

      case PlayOption.privateGame:
        if (roomName) {
          const waitingPlayer = this.privateGameQueue.get(roomName);

          if (waitingPlayer?.id === id) {
            return;
          }

          if (waitingPlayer) {
            const player1 = waitingPlayer;
            const player2 = {
              id,
              username,
              socketId: client.id,
            };

            const uniqueRoomName = roomName || `room-${uuidv4()}`;

            client.join(uniqueRoomName);

            this.gameService.startGameWithRandom(
              player1.id,
              player1.username,
              player1.socketId,
              player2.id,
              player2.username,
              client.id,
              uniqueRoomName,
              this.server,
              this.gamesManagers,
            );

            this.privateGameQueue.delete(roomName);
          } else {
            client.join(roomName);
            this.privateGameQueue.set(roomName, {
              id,
              username,
              socketId: client.id,
            });
          }
        }
        break;

      default:
        console.log('Invalid play option');
        break;
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

    const gameManagerForRoom = this.getGameManagerByRoom(roomName);
    gameManagerForRoom.updatePaddlePosition(playerId, paddlePosition);
  }

  handleDisconnect(client: Socket) {
    this.handlePlayerDisconnect(client.id);
    console.log(`Client disconnected from GameGateway: ${client.id}`);
  }

  handlePlayerDisconnect(disconnectedPlayerId: string) {
    const gameManagerEntry = [...this.gamesManagers].find(
      (entry) =>
        entry.player1SocketId === disconnectedPlayerId ||
        entry.player2SocketId === disconnectedPlayerId,
    );

    if (gameManagerEntry) {
      const { gameManager } = gameManagerEntry;

      gameManager.handlePlayerDisconnect(disconnectedPlayerId);
      this.gamesManagers.delete(gameManagerEntry);
    }
  }
}
