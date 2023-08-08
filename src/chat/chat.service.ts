import { Injectable, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async handleSetAdmin(roomId: number, userId: number, requestingUser: number) {
    const isRequestingUserAdmin = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        admins: {
          some: {
            id: requestingUser,
          },
        },
      },
    });

    if (!isRequestingUserAdmin) {
      throw new UnauthorizedException(
        'Only admins can set other users as admins',
      );
    }

    try {
      await this.prisma.room.update({
        where: {
          id: roomId,
        },
        data: {
          users: {
            connect: {
              id: userId,
            },
          },
          admins: {
            connect: {
              id: userId,
            },
          },
        },
        include: {
          admins: true,
        },
      });
      console.log(`user ${userId} is now Admin`);
    } catch (error) {
      console.log(error);
    }
  }

  async handleLeaveRoom(client: Socket, roomId: string, userID: number) {
    const roomID = parseInt(roomId, 10);

    try {
      const room = await this.prisma.room.findUnique({
        where: {
          id: roomID,
        },
        include: {
          admins: true,
          owner: true,
          users: true,
        },
      });

      if (!room) return;

      const isAdmin = room.admins.some((admin) => admin.id === userID);
      // console.log('isAdmin ==> ', isAdmin);
      const isOwner = room.owner.id === userID;
      // console.log('isOwner ==> ', isOwner);

      if (isAdmin || isOwner) {
        let newOwnerId = null;

        if (isOwner) {
          const participants = room.users;
          const currentOwnerIndex = participants.findIndex(
            (participants) => participants.id === userID,
          );
          const nextOwnerIndex = (currentOwnerIndex + 1) % participants.length;
          newOwnerId = participants[nextOwnerIndex].id;
          // console.log('newOwnerId ==> ', newOwnerId);
        }

        await this.prisma.room.update({
          where: {
            id: roomID,
          },
          data: {
            admins: {
              disconnect: {
                id: userID,
              },
            },
            users: {
              disconnect: {
                id: userID,
              },
            },
            owner: {
              connect: {
                id: newOwnerId,
              },
            },
          },
        });

        client.leave(`room:${roomID}`);
        client.to(`room:${roomID}`).emit('participantLeft', client.id);

        if (newOwnerId) {
          client.to(`room:${roomId}`).emit('newOwner', newOwnerId);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async handleDeleteRoom(client: Socket, roomId: string, server: Server) {
    const roomID = parseInt(roomId, 10);

    try {
      await this.prisma.room.delete({
        where: {
          id: roomID,
        },
        include: {
          messages: true,
        },
      });

      server.to(`room:${roomID}`).emit('roomDeleted');
    } catch (error) {
      console.log(error);
    }
  }

  async extractUserIdFromHeader(@Req() req: Request) {
    const token = req.headers.authorization;
    // console.log(token);

    try {
      const decoded = this.jwtService.verify(token.replace('Bearer ', ''));
      const userId = decoded.sub;
      return userId;
    } catch (error) {
      console.log(error);
    }
  }

  async extractUserId(client: Socket) {
    const token = client.handshake.headers.authorization;

    try {
      const decoded = this.jwtService.verify(token.replace('bearer ', ''));
      const userId = decoded.sub;
      return userId;
    } catch (error) {
      console.log(error);
    }
  }

  async handleJoinRoom(client: Socket, roomId: string, userID: number) {
    const roomID = parseInt(roomId, 10);

    const chatRoom = await this.prisma.room.findUnique({
      where: {
        id: roomID,
      },
    });
    if (chatRoom) {
      await this.prisma.room.update({
        where: {
          id: roomID,
        },
        data: {
          users: {
            connect: {
              id: userID,
            },
          },
        },
      });
      client.join(`room:${roomID}`);
      client.emit(`roomJoined`);
    } else {
      console.log('Room not Found');
    }
  }

  // async handleSendMessage(
  //   client: Socket,
  //   roomId: string,
  //   message: string,
  //   userID: number,
  //   server: Server,
  // ) {
  //   const roomID = parseInt(roomId, 10);

  //   const chatRoom = await this.prisma.room.findUnique({
  //     where: {
  //       id: roomID,
  //     },
  //   });

  //   if (chatRoom) {
  //     const createdMessage = await this.prisma.message.create({
  //       data: {
  //         content: message,
  //         room: {
  //           connect: {
  //             id: roomID,
  //           },
  //         },
  //         sender: {
  //           connect: {
  //             id: userID,
  //           },
  //         },
  //       },
  //     });
  //     server.to(`room:${roomID}`).emit('message', createdMessage);
  //   } else {
  //     client.emit('roomError', { message: 'Chat room not found' });
  //   }
  // }

  async handleCreateRoom(otherUser: number, userID: number) {
    try {
      const existingRoom = await this.prisma.room.findFirst({
        where: {
          AND: [
            { users: { some: { id: otherUser } } },
            {
              users: { some: { id: userID } },
            },
          ],
        },
        include: {
          users: true,
          messages: true,
        },
      });

      if (existingRoom) {
        return existingRoom;
      } else {
        const newRoom = await this.prisma.room.create({
          data: {
            users: {
              connect: [
                {
                  id: userID,
                },
                {
                  id: otherUser,
                },
              ],
            },
            uid: uuidv4(),
          },
          include: {
            users: true,
            messages: true,
          },
        });
        return newRoom;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async handleGetRoomMessages(roomId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          roomID: roomId,
        },
        include: {
          sender: true,
          seen: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!messages) {
        throw Error('No Messages Found');
      }

      return messages;
    } catch (error) {
      return error;
    }
  }

  async handleSendMessage(
    userID: number,
    conversationdId: string,
    message: string,
  ) {
    try {
      const newMessage = await this.prisma.message.create({
        data: {
          content: message,
          room: {
            connect: {
              uid: conversationdId,
            },
          },
          sender: {
            connect: {
              id: userID,
            },
          },
          seen: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          sender: true,
          seen: true,
        },
      });

      if (!message) {
        throw new Error('Error while sending the message');
      }

      const updatedRoom = await this.prisma.room.update({
        where: {
          uid: conversationdId,
        },
        data: {
          lastMessageAt: new Date(),
          messages: {
            connect: {
              id: newMessage.id,
            },
          },
        },
        include: {
          users: true,
          messages: {
            include: {
              seen: true,
            },
          },
        },
      });

      if (!updatedRoom) {
        throw Error('Error updating room');
      }

      return newMessage;
    } catch (error) {
      return error;
    }
  }

  async handleGetMyChats(userID: number) {
    try {
      const rooms = await this.prisma.room.findMany({
        orderBy: {
          lastMessageAt: 'desc',
        },
        where: {
          users: {
            some: {
              id: userID,
            },
          },
        },
        include: {
          users: true,
          messages: {
            include: {
              sender: true,
              seen: true,
            },
          },
        },
      });

      return rooms;
    } catch (error) {
      return error;
    }
  }
}
