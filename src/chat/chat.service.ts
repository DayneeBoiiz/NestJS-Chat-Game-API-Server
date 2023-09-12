import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { User } from '@prisma/client';
import { MainGateway } from 'src/main/main.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGatway: ChatGateway,
    @Inject(forwardRef(() => MainGateway))
    private readonly globalGatway: MainGateway,
  ) {}

  async handleMute(userID: number, conversationId: string, targetUser: number) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationId,
        },
        include: {
          owner: true,
          admins: true,
        },
      });

      if (!room) {
        throw new Error('there is no such room');
      }

      const existingUser = await this.isUserInRoom(targetUser, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isOwner = room.owner.id === userID;
      const isAdmin = room.admins.some((admin) => admin.id === userID);

      if (isOwner || isAdmin) {
        const target_own = room.owner.id === targetUser;
        if (target_own) {
          throw new Error("Admins can't mute owner");
        }

        const updatedRoom = await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            mutedUsers: {
              connect: {
                id: targetUser,
              },
            },
          },
        });
        return updatedRoom;
      } else {
        throw new UnauthorizedException('Only admin / owner can mute');
      }
    } catch (error) {
      // console.log(error);
    }
  }

  async handleBan(userID: number, conversationId: string, targetUser: number) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationId,
        },
        include: {
          owner: true,
          admins: true,
        },
      });

      const existingUser = await this.isUserInRoom(targetUser, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isOwner = room.owner.id === userID;
      const isAdmin = room.admins.some((admin) => admin.id === userID);

      if (isOwner || isAdmin) {
        const target_own = room.owner.id === targetUser;
        if (target_own) {
          throw new Error("Admins can't mute owner");
        }

        const updatedRoom = await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            bannedUsers: {
              connect: {
                id: targetUser,
              },
            },
            users: {
              disconnect: {
                id: targetUser,
              },
            },
          },
        });

        return updatedRoom;
      } else {
        throw new UnauthorizedException('Only admin / owner can mute');
      }
    } catch (error) {
      // console.log(error);
    }
  }

  async handleKick(
    userID: number,
    conversationdId: string,
    targetUser: number,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdId,
        },
        include: {
          owner: true,
          admins: true,
        },
      });

      const existingUser = await this.isUserInRoom(targetUser, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isOwner = room.owner.id === userID;
      const isAdmin = room.admins.some((admin) => admin.id === userID);

      if (isOwner || isAdmin) {
        const target_own = room.owner.id === targetUser;
        if (target_own) {
          throw new Error("Admins can't kick owner");
        }

        const updatedRoom = await this.prisma.room.update({
          where: {
            uid: conversationdId,
          },
          data: {
            users: {
              disconnect: {
                id: targetUser,
              },
            },
          },
        });

        return updatedRoom;
      }
    } catch (error) {
      // console.log(error);
    }
  }

  async handleSetAdmin(
    userID: number,
    conversationId: string,
    updatedUser: number,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationId,
        },
        include: {
          admins: true,
          owner: true,
        },
      });

      const existingUser = await this.isUserInRoom(updatedUser, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isAdmin = room.admins.some((admin) => admin.id === userID);
      const isOwner = room.owner.id === userID;

      if (isAdmin || isOwner) {
        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            admins: {
              connect: {
                id: updatedUser,
              },
            },
          },
        });
      } else {
        throw new UnauthorizedException(
          'Only admins can set other users as admins',
        );
      }

      // console.log(`user ${updatedUser} is now Admin`);
    } catch (error) {
      // console.log(error);
    }
  }

  async handleRemoveAdmin(
    userID: number,
    conversationId: string,
    updatedUser: number,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationId,
        },
        include: {
          admins: true,
          owner: true,
        },
      });

      const existingUser = await this.isUserInRoom(updatedUser, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isAdmin = room.admins.some((admin) => admin.id === userID);
      const isOwner = room.owner.id === userID;

      if (isAdmin || isOwner) {
        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            admins: {
              disconnect: {
                id: updatedUser,
              },
            },
          },
        });
      } else {
        throw new UnauthorizedException(
          'Only admins can set other users as admins',
        );
      }

      // console.log(`user ${updatedUser} is now normal User`);
    } catch (error) {
      // console.log(error);
    }
  }

  async handleSetChannelPassword(
    userID: number,
    conversationdId: string,
    password: string,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdId,
        },
        include: {
          owner: true,
        },
      });

      if (room.isProtected) {
        throw new Error('Room already protected with password');
      }

      if (!room) {
        throw new Error('room not found');
      }

      const isOwner = room.owner.id === userID;

      if (isOwner) {
        const hash = await argon.hash(password);

        const updatedRoom = await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            isGroup: null,
            isPrivate: null,
            isPrivateKey: null,
            isProtected: true,
            password: hash,
          },
        });

        return updatedRoom;
      } else {
        throw new UnauthorizedException(
          'you have to be the Channel Owner to do that',
        );
      }
    } catch (error) {
      // console.log(error);
    }
  }

  async handleLeaveRoom(conversationdID: string, userID: number) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdID,
        },
        include: {
          admins: true,
          users: true,
          owner: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      const existingUser = await this.isUserInRoom(userID, room.id);

      if (!existingUser) {
        throw new Error('User need to be a member of the room');
      }

      const isAdmin = room.admins.some((admin) => admin.id === userID);
      const isOwner = room.owner.id === userID;
      const isLastUser = room.users.length === 1 && room.users[0].id === userID;

      if (isAdmin || isOwner) {
        let newOwnerId = null;

        if (isOwner) {
          const participants = room.users;
          const currentOwnerIndex = participants.findIndex(
            (participants) => participants.id === userID,
          );
          const nextOwnerIndex = (currentOwnerIndex + 1) % participants.length;
          newOwnerId = participants[nextOwnerIndex].id;
        }

        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            admins: {
              disconnect: {
                id: userID,
              },
              connect: {
                id: newOwnerId,
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

        if (isLastUser) {
          await this.prisma.message.deleteMany({
            where: {
              roomID: room.uid,
            },
          });

          await this.prisma.room.delete({
            where: {
              uid: conversationdID,
            },
          });
        }
      }

      await this.prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          users: {
            disconnect: {
              id: userID,
            },
          },
        },
      });

      return room;
    } catch (error) {
      throw new Error(error);
    }
  }

  // async handleLeaveRoom(client: Socket, roomId: string, userID: number) {
  //   const roomID = parseInt(roomId, 10);

  //   try {
  //     const room = await this.prisma.room.findUnique({
  //       where: {
  //         id: roomID,
  //       },
  //       include: {
  //         admins: true,
  //         owner: true,
  //         users: true,
  //       },
  //     });

  //     if (!room) return;

  //     const isAdmin = room.admins.some((admin) => admin.id === userID);
  //     // // console.log('isAdmin ==> ', isAdmin);
  //     const isOwner = room.owner.id === userID;
  //     // // console.log('isOwner ==> ', isOwner);

  //     if (isAdmin || isOwner) {
  //       let newOwnerId = null;

  //       if (isOwner) {
  //         const participants = room.users;
  //         const currentOwnerIndex = participants.findIndex(
  //           (participants) => participants.id === userID,
  //         );
  //         const nextOwnerIndex = (currentOwnerIndex + 1) % participants.length;
  //         newOwnerId = participants[nextOwnerIndex].id;
  //         // // console.log('newOwnerId ==> ', newOwnerId);
  //       }

  //       await this.prisma.room.update({
  //         where: {
  //           id: roomID,
  //         },
  //         data: {
  //           admins: {
  //             disconnect: {
  //               id: userID,
  //             },
  //           },
  //           users: {
  //             disconnect: {
  //               id: userID,
  //             },
  //           },
  //           owner: {
  //             connect: {
  //               id: newOwnerId,
  //             },
  //           },
  //         },
  //       });

  //       client.leave(`room:${roomID}`);
  //       client.to(`room:${roomID}`).emit('participantLeft', client.id);

  //       if (newOwnerId) {
  //         client.to(`room:${roomId}`).emit('newOwner', newOwnerId);
  //       }
  //     }
  //   } catch (error) {
  //     // console.log(error);
  //   }
  // }

  // async handleDeleteRoom(client: Socket, roomId: string, server: Server) {
  //   const roomID = parseInt(roomId, 10);

  //   try {
  //     await this.prisma.room.delete({
  //       where: {
  //         id: roomID,
  //       },
  //       include: {
  //         messages: true,
  //       },
  //     });

  //     server.to(`room:${roomID}`).emit('roomDeleted');
  //   } catch (error) {
  //     // console.log(error);
  //   }
  // }

  // async extractUserIdFromHeader(@Req() req: Request) {
  //   const token = req.headers.authorization;
  //   // // console.log(token);

  //   try {
  //     const decoded = this.jwtService.verify(token.replace('Bearer ', ''));
  //     const userId = decoded.sub;
  //     return userId;
  //   } catch (error) {
  //     // console.log(error);
  //   }
  // }

  // async extractUserId(client: Socket) {
  //   const token = client.handshake.headers.authorization;

  //   try {
  //     const decoded = this.jwtService.verify(token.replace('bearer ', ''));
  //     const userId = decoded.sub;
  //     return userId;
  //   } catch (error) {
  //     // console.log(error);
  //   }
  // }

  // async handleJoinRoom(client: Socket, roomId: string, userID: number) {
  //   const roomID = parseInt(roomId, 10);

  //   const chatRoom = await this.prisma.room.findUnique({
  //     where: {
  //       id: roomID,
  //     },
  //   });
  //   if (chatRoom) {
  //     await this.prisma.room.update({
  //       where: {
  //         id: roomID,
  //       },
  //       data: {
  //         users: {
  //           connect: {
  //             id: userID,
  //           },
  //         },
  //       },
  //     });
  //     client.join(`room:${roomID}`);
  //     client.emit(`roomJoined`);
  //   } else {
  //     // console.log('Room not Found');
  //   }
  // }

  uniqueCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 6;

    const code = Array.from(
      { length: codeLength },
      () => characters[Math.floor(Math.random() * characters.length)],
    ).join('');
    return code;
  };

  async createPrivateRoom(name: string, members: number[], userID: number) {
    try {
      if (!name) {
        throw Error('A name is needed for group chat');
      }

      const existingRoom = await this.prisma.room.findFirst({
        where: {
          name,
        },
      });

      if (existingRoom) {
        throw new Error('A room with this name already exists');
      }

      const room = await this.prisma.room.create({
        data: {
          name: name,
          uid: uuidv4(),
          isChannel: true,
          isPrivate: true,
          isPrivateKey: this.uniqueCode(),
          ownerID: userID,
          admins: {
            connect: {
              id: userID,
            },
          },
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          admins: true,
          users: true,
        },
      });

      if (members && members.length > 0) {
        const users = await this.prisma.user.findMany({
          where: {
            id: {
              in: members,
            },
          },
        });

        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            users: {
              connect: users.map((user) => ({ id: user.id })),
            },
          },
          include: {
            admins: true,
            users: true,
          },
        });
      }

      this.globalGatway.server.emit('conversation:new', room);

      return room;
    } catch (error) {
      return { error: error.message };
    }
  }

  async createProtectedRoom(
    name: string,
    members: number[],
    password: string,
    userID: number,
  ) {
    try {
      if (!name || !password) {
        throw Error('A name / password is needed for private chat');
      }

      const existingRoom = await this.prisma.room.findFirst({
        where: {
          name,
        },
      });

      if (existingRoom) {
        throw new Error('A room with this name already exists');
      }

      const hash = await argon.hash(password);

      const room = await this.prisma.room.create({
        data: {
          name: name,
          uid: uuidv4(),
          isChannel: true,
          isProtected: true,
          ownerID: userID,
          password: hash,
          admins: {
            connect: {
              id: userID,
            },
          },
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          admins: true,
          users: true,
        },
      });

      if (members && members.length > 0) {
        const users = await this.prisma.user.findMany({
          where: {
            id: {
              in: members,
            },
          },
        });

        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            users: {
              connect: users.map((user) => ({ id: user.id })),
            },
          },
          include: {
            admins: true,
            users: true,
          },
        });
      }

      this.globalGatway.server.emit('conversation:new', room);

      return room;
    } catch (error) {
      return { error: error.message };
    }
  }

  async createGroupRoom(name: string, members: number[], userID: number) {
    try {
      if (!name) {
        throw Error('A name is needed for group chat');
      }

      const existingRoom = await this.prisma.room.findFirst({
        where: {
          name,
        },
      });

      if (existingRoom) {
        throw new Error('A room with this name already exists');
      }

      const room = await this.prisma.room.create({
        data: {
          name: name,
          uid: uuidv4(),
          isChannel: true,
          isGroup: true,
          ownerID: userID,
          admins: {
            connect: {
              id: userID,
            },
          },
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          users: true,
        },
      });

      if (members && members.length > 0) {
        const users = await this.prisma.user.findMany({
          where: {
            id: {
              in: members,
            },
          },
        });

        await this.prisma.room.update({
          where: {
            id: room.id,
          },
          data: {
            users: {
              connect: users.map((user) => ({ id: user.id })),
            },
          },
          include: {
            users: true,
          },
        });
      }

      this.globalGatway.server.emit('conversation:new', room);

      return room;
    } catch (error) {
      return { error: error.message };
    }
  }

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
          isGroup: null,
          isProtected: null,
          isPrivate: null,
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

        this.globalGatway.server.emit('conversation:new', newRoom);

        return newRoom;
      }
    } catch (error) {
      // console.log(error);
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

  async isBlocked(userID: number, otherUserID: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userID,
      },
      include: {
        blockedUsers: {
          where: {
            blockedUserID: otherUserID,
          },
        },
        usersBlockedBy: {
          where: {
            blockedUserID: userID,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user.blockedUsers.length > 0 || user.usersBlockedBy.length > 0;
  }

  async handleSendMessage(
    userID: number,
    conversationdId: string,
    message: string,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdId,
        },
        include: {
          users: true,
          mutedUsers: true,
        },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (!room.isChannel) {
        const otherUser = room.users.find((user) => user.id !== userID);

        const isBlocked = await this.isBlocked(userID, otherUser.id);

        if (isBlocked && !room.isChannel) {
          throw new Error(
            'You are blocked from sending messages in this conversation.',
          );
        }
      }

      const isMuted = room.mutedUsers.some((user) => user.id === userID);

      if (isMuted) {
        throw new Error('You are Muted');
      }

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

      const lastMessage = updatedRoom.messages[updatedRoom.messages.length - 1];

      const eventPayload = {
        content: newMessage.content,
        sender: newMessage.sender,
        seen: newMessage.seen,
      };

      // the sender -> blocklist from bothsides
      // create an array of socketIds
      this.chatGatway.server
        .to(conversationdId)
        .except([])
        .emit('message:new', eventPayload);

      this.globalGatway.server.emit('conversation:update', {
        uid: updatedRoom.uid,
        messages: [lastMessage],
      });

      return newMessage;
    } catch (error) {
      return error;
    }
  }

  async handleGetMyChats(userID: number) {
    try {
      const rooms = await this.prisma.room.findMany({
        orderBy: {
          lastMessageAt: 'asc',
        },
        where: {
          users: {
            some: {
              id: userID,
            },
          },
          isGroup: null,
          isPrivate: null,
          isProtected: null,
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

  async getOtherUser(conversationID: string, user: User) {
    const userID = user.id;
    const room = await this.prisma.room.findUnique({
      where: {
        uid: conversationID,
      },
      include: {
        users: true,
      },
    });

    if (!room) {
      throw new Error('Room not Found');
    }

    const otherUser = room.users.find((user) => user.id !== userID);

    if (!otherUser) {
      throw new Error('Other user not found in the conversation');
    }

    delete otherUser.hash;
    return otherUser;
  }

  async getPublicRooms() {
    try {
      const publicRooms = await this.prisma.room.findMany({
        where: {
          isGroup: true,
        },
        include: {
          owner: true,
          users: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!publicRooms) {
        throw new NotFoundException('No Rooms Found');
      }

      return publicRooms;
    } catch (error) {
      return { error: error.message };
    }
  }

  async getProtectedRooms() {
    try {
      const protectedRooms = await this.prisma.room.findMany({
        where: {
          isProtected: true,
        },
        include: {
          owner: true,
          users: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!protectedRooms) {
        throw new NotFoundException('No Rooms Found');
      }

      return protectedRooms;
    } catch (error) {
      return { error: error.message };
    }
  }

  // async getPrivateRooms() {
  //   try {
  //     const privateRooms = await this.prisma.room.findMany({
  //       where: {
  //         isPrivate: true,
  //       },
  //       include: {
  //         owner: true,
  //         users: true,
  //       },
  //       orderBy: {
  //         createdAt: 'desc',
  //       },
  //     });

  //     if (!privateRooms) {
  //       throw new NotFoundException('No Rooms Found');
  //     }

  //     return privateRooms;
  //   } catch (error) {
  //     return { error: error.message };
  //   }
  // }

  async isUserInRoom(userId: number, roomId: number): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: {
        id: roomId,
      },
      include: {
        users: {
          where: {
            id: userId,
          },
        },
      },
    });

    return !!room?.users.length;
  }

  async joinPublicRoom(conversationdID: string, userID: number) {
    try {
      const room = await this.prisma.room.findFirst({
        where: {
          uid: conversationdID,
          isGroup: true,
        },
        include: {
          bannedUsers: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Public room not found');
      }

      const isBanned = room.bannedUsers.some((user) => user.id === userID);

      if (isBanned) {
        throw new Error('You are banned from the channel');
      }

      const isMember = await this.isUserInRoom(userID, room.id);

      if (isMember) {
        throw new Error('User is already a member of the room');
      }

      await this.prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          users: true,
        },
      });

      return room;
    } catch (error) {
      throw new Error(error);
    }
  }

  async joinPrivateRoom(userID: number, roomKey: string) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          isPrivateKey: roomKey,
        },
        include: {
          users: true,
          owner: true,
          admins: true,
          bannedUsers: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Public room not found');
      }

      const isBanned = room.bannedUsers.some((user) => user.id === userID);

      if (isBanned) {
        throw new Error('You are banned from the channel');
      }

      const isMember = await this.isUserInRoom(userID, room.id);

      if (isMember) {
        throw new Error('User is already a member of the room');
      }

      await this.prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          users: true,
        },
      });

      return room;
    } catch (error) {
      throw new Error(error);
    }
  }

  async joinProtectedRoom(
    conversationdID: string,
    userID: number,
    password: string,
  ) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdID,
        },
        include: {
          users: true,
          owner: true,
          admins: true,
          bannedUsers: true,
        },
      });

      if (!room) {
        throw new NotFoundException('Public room not found');
      }

      const isBanned = room.bannedUsers.some((user) => user.id === userID);

      if (isBanned) {
        throw new Error('You are banned from the channel');
      }

      const isMatch = await argon.verify(room.password, password);

      if (!isMatch) {
        throw new UnauthorizedException('Incorrect password');
      }

      const isMember = await this.isUserInRoom(userID, room.id);

      if (isMember) {
        throw new Error('User is already a member of the room');
      }

      await this.prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          users: {
            connect: {
              id: userID,
            },
          },
        },
        include: {
          users: true,
        },
      });

      return room;
    } catch (error) {
      throw new Error(error);
    }
  }

  async handleGetMyRooms(userID: number) {
    try {
      const myRooms = await this.prisma.room.findMany({
        where: {
          users: {
            some: {
              id: userID,
            },
          },
          isChannel: true,
        },
        include: {
          users: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!myRooms) {
        throw new NotFoundException('No Rooms Found');
      }

      return myRooms;
    } catch (error) {
      return { error: error.message };
    }
  }

  async handleGetChannelDetails(userID: number, conversationdID: string) {
    try {
      const room = await this.prisma.room.findUnique({
        where: {
          uid: conversationdID,
        },
        include: {
          users: true,
          admins: true,
          owner: true,
          messages: {
            select: {
              content: true,
              roomID: true,
              seen: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  createdAt: true,
                  updatedAt: true,
                  email: true,
                  nickname: true,
                  hash: true,
                  TwofaAutSecret: true,
                  TwofaAutEnabled: true,
                  FirstLogin: true,
                  avatarUrl: true,
                  state: true,
                  provider: true,
                  friendStatus: true,
                  isChanged: true,
                },
              },
            },
          },
        },
      });

      // id: number;
      // createdAt: string;
      // updatedAt: string;
      // email: string;
      // nickname: string;
      // hash: string;
      // TwofaAutSecret: null | string;
      // TwofaAutEnabled: boolean;
      // FirstLogin: boolean;
      // avatarUrl: string;
      // state: string;
      // provider: string;
      // friendStatus: string;
      // isChanged: boolean;

      const isMember = await this.isUserInRoom(userID, room.id);

      if (!isMember) {
        throw new Error('User is not a member of the room');
      }

      return room;
    } catch (error) {
      throw new Error(error);
    }
  }
}
