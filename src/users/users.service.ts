import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as argon from 'argon2';
import { Response } from 'express';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { NewPassDto, UsernameDto } from 'src/auth/dto';
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { MainGateway } from 'src/main/main.gateway';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject(forwardRef(() => MainGateway))
    private readonly globalGatway: MainGateway,
  ) {
    this.scheduleDataCleanup();
  }

  private userSocketsMap: Map<number, Socket[]> = new Map<number, Socket[]>();

  private scheduleDataCleanup() {
    const job = new CronJob('*/15 * * * *', async () => {
      try {
        await this.deleteOldTokens();
        await this.unmuteUsers();
      } catch (error) {
        console.error('Error deleting blocked users:', error);
      }
    });

    job.start();
  }

  async unmuteUsers() {
    const users = await this.prisma.user.findMany();
    for (const user of users) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isMuted: { set: [] } },
      });
    }
  }

  async handleGetAllUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(({ hash, TwofaAutSecret, ...rest }) => rest);
  }

  async addToBlockedTokens(token: string): Promise<void> {
    await this.prisma.blockedTokens.create({ data: { token } });
  }

  async ongameStats(userID: number) {
    await this.prisma.user.update({
      where: {
        id: userID,
      },
      data: {
        state: 'playing',
      },
    });
  }

  async onlineState(userID: number) {
    await this.prisma.user.update({
      where: {
        id: userID,
      },
      data: {
        state: 'online',
      },
    });
  }

  async offlineState(userID: number) {
    await this.prisma.user.update({
      where: {
        id: userID,
      },
      data: {
        state: 'offline',
      },
    });
  }

  async extratUserIdFromHeader(token: string) {
    try {
      const decoded = this.jwtService.verify(token.replace('Bearer ', ''));
      const userID = decoded.sub;
      return userID;
    } catch (error) {
      console.log(error);
    }
  }

  async handleRemoveFriend(userName: string, reqUserID: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: reqUserID,
        },
      });

      const friend = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
      });

      if (user.id === friend.id) {
        throw new Error('Cannot remove yourself');
      }

      const firstFriendship = await this.prisma.friend.findFirst({
        where: {
          sentByID: user.id,
          receivedByID: friend.id,
        },
      });

      if (!firstFriendship) {
        throw new Error('Friendship not found');
      }

      const secondFriendship = await this.prisma.friend.findFirst({
        where: {
          sentByID: friend.id,
          receivedByID: user.id,
        },
      });

      if (!secondFriendship) {
        throw new Error('Friendship not found');
      }

      // console.log(firstFriendship);
      // console.log(secondFriendship);

      await this.prisma.friend.delete({
        where: {
          id: firstFriendship.id,
        },
      });

      await this.prisma.friend.delete({
        where: {
          id: secondFriendship.id,
        },
      });

      this.globalGatway.server.emit('friend:remove', friend.nickname);

      return { message: 'Friend removed' };
    } catch (error) {
      console.log(error);
      // throw new Error('Failed to remove friend');
    }
  }

  async handleRejectFriendRequest(receiverName: string, senderName: string) {
    try {
      // Check if the friend request exists
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          sender: {
            nickname: senderName,
          },
          recipient: {
            nickname: receiverName,
          },
        },
        include: {
          recipient: true,
        },
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      console.log(friendRequest.recipient.nickname);

      // Check if the sender is actually the recipient of the friend request
      if (friendRequest.recipient.nickname === senderName) {
        throw new Error('You can only reject friend requests sent to you.');
      }

      // Delete the friend request
      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });

      return 'Friend request rejected successfully';
    } catch (error) {
      throw new Error('Failed to reject friend request');
    }
  }

  async handleCancelFriendRequest(userID: number, userName: string) {
    try {
      const recipient = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
      });

      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Check if the recipient made the friend request to the user
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          OR: [
            {
              senderID: recipient.id,
              recipientID: userID,
            },
            {
              senderID: userID,
              recipientID: recipient.id,
            },
          ],
        },
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      // Check if the user requested with themselves
      if (friendRequest.senderID === friendRequest.recipientID) {
        throw new Error(
          "You can't cancel a friend request you made to yourself.",
        );
      }

      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });

      return { message: 'Friend request cancelled' };
    } catch (error) {
      throw new Error('Failed to cancel friend request');
    }

    // try {
    //   const recipient = await this.prisma.user.findUnique({
    //     where: {
    //       nickname: userName,
    //     },
    //   });

    //   const friendRequest = await this.prisma.friendRequest.findFirst({
    //     where: {
    //       senderID: userID,
    //       recipientID: recipient.id,
    //     },
    //   });

    //   if (!friendRequest) {
    //     throw new Error('Friend request not found');
    //   }

    //   await this.prisma.friendRequest.delete({
    //     where: {
    //       id: friendRequest.id,
    //     },
    //   });
    //   return { message: 'Friend request cancelled' };
    // } catch (error) {
    //   console.log(error);
    //   throw new Error('Failed to cancel friend request');
    // }
  }

  async getUsersId(senderUserName: string, recieverUserName: string) {
    try {
      // console.log(senderUserName);
      // console.log(recieverUserName);
      const sender = await this.prisma.user.findUnique({
        where: {
          nickname: senderUserName,
        },
      });

      const reciever = await this.prisma.user.findUnique({
        where: {
          nickname: recieverUserName,
        },
      });

      if (!sender || !reciever) {
        throw new Error('Invalid Usename');
      }

      return { senderID: sender.id, receiverID: reciever.id };
    } catch (error) {
      console.log(error);
    }
  }

  async handleAcceptFriendRequest(senderName: string, receiverName: string) {
    try {
      const { senderID, receiverID } = await this.getUsersId(
        senderName,
        receiverName,
      );

      // Check if the friend request exists
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          sender: {
            nickname: senderName,
          },
          recipient: {
            nickname: receiverName,
          },
        },
        include: {
          recipient: true,
        },
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      // Check if the sender is actually the recipient of the friend request
      if (friendRequest.recipient.nickname === senderName) {
        throw new Error('You can only accept friend requests sent to you.');
      }

      // Create friendship records for both users
      await this.prisma.friend.createMany({
        data: [
          {
            sentByID: senderID,
            receivedByID: receiverID,
          },
          {
            sentByID: receiverID,
            receivedByID: senderID,
          },
        ],
      });

      const friend = await this.prisma.friend.findFirst({
        where: {
          sentBy: {
            id: senderID,
          },
        },
        include: {
          sentBy: {
            select: {
              avatarUrl: true,
              id: true,
              nickname: true,
              email: true,
              state: true,
              friendStatus: true,
              provider: true,
              isChanged: true,
            },
          },
        },
      });

      // Delete the friend request
      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });

      const payload = {
        avatarUrl: friend.sentBy.avatarUrl,
        id: friend.sentBy.id,
        nickname: friend.sentBy.nickname,
        email: friend.sentBy.email,
        state: friend.sentBy.state,
        friendStatus: friend.sentBy.friendStatus,
        provider: friend.sentBy.provider,
        isChanged: friend.sentBy.isChanged,
      };

      this.globalGatway.server.emit('friend:new', payload);

      return 'Friend request accepted successfully';
    } catch (error) {
      throw new Error('Failed to accept friend request');
    }
  }

  async handleSendFriendRequest(userName: string, recipientUserName: string) {
    try {
      const sender = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
        include: {
          sentFriendRequests: {
            where: {
              recipient: {
                nickname: recipientUserName,
              },
            },
          },
          sentFriends: {
            where: {
              sentBy: {
                nickname: userName,
              },
            },
          },
        },
      });

      if (!sender) {
        throw new Error('Invalid sender');
      }

      const recipient = await this.prisma.user.findUnique({
        where: {
          nickname: recipientUserName,
        },
      });

      if (sender.id === recipient.id) {
        throw new Error('Invalid Request');
      }

      if (!recipient) {
        throw new Error('Invalid recipient');
      }

      if (
        sender.sentFriendRequests.length > 0
        // sender.sentFriends.length > 0
      ) {
        throw new Error(
          'Friend request already sent or users are already friends',
        );
      }

      const friendRequest = await this.prisma.friendRequest.create({
        data: {
          sender: {
            connect: {
              id: sender.id,
            },
          },
          recipient: {
            connect: {
              id: recipient.id,
            },
          },
        },
        include: {
          sender: true,
        },
      });

      this.globalGatway.server.emit('friendRequest:new', friendRequest);

      return { message: 'Friend request sent' };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to send friend request');
    }
  }

  async handleGetProfile(userName: string, userID: number) {
    const publicProfile = await this.prisma.user.findUnique({
      where: {
        nickname: userName,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        friendStatus: true,
        provider: true,
        isChanged: true,
        sentFriendRequests: {
          where: {
            recipientID: userID,
          },
          select: {
            friendRequestStatus: true,
            recipientID: true,
          },
        },
        receivedFriendRequests: {
          where: {
            senderID: userID,
          },
          select: {
            friendRequestStatus: true,
            senderID: true,
          },
        },
        sentFriends: {
          where: {
            receivedByID: userID,
          },
          select: {
            receivedByID: true,
          },
        },
        receivedFriends: {
          where: {
            sentByID: userID,
          },
          select: {
            sentByID: true,
          },
        },
      },
    });

    if (
      publicProfile.sentFriendRequests.some((req) => req.recipientID === userID)
    ) {
      publicProfile.friendStatus = 'Pending Received';
    } else if (
      publicProfile.receivedFriendRequests.some(
        (req) => req.senderID === userID,
      )
    ) {
      publicProfile.friendStatus = 'Pending Sent';
    } else if (
      publicProfile.sentFriends.some((friend) => friend.receivedByID === userID)
    ) {
      publicProfile.friendStatus = 'friend';
    } else if (
      publicProfile.receivedFriends.some((friend) => friend.sentByID === userID)
    ) {
      publicProfile.friendStatus = 'friend';
    }

    // console.log(publicProfile.receivedFriendRequests);

    return publicProfile;
  }

  async handleUnblockUser(userName: string, blockedUserName: string) {
    try {
      const blockedUser = await this.prisma.user.findUnique({
        where: {
          nickname: blockedUserName,
        },
      });

      if (!blockedUser) {
        throw new Error('User not found');
      }

      const user = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const unblockUser = await this.prisma.blockedUser.delete({
        where: {
          blockedUserID: blockedUser.id,
        },
      });

      return unblockUser;
    } catch (error) {
      console.log(error);
    }
  }

  async handleGetBlockedUsers() {
    try {
      const blockedUsers = await this.prisma.blockedUser.findMany({
        include: {
          user: true,
          blockedUser: true,
        },
      });

      const blockedUsersData = blockedUsers.map((blockedUser) => ({
        blockedUserID: blockedUser.blockedUser.id,
        blockedUserNickname: blockedUser.blockedUser.nickname,
        blockingUserID: blockedUser.user.id,
        blockingUserNickname: blockedUser.user.nickname,
      }));

      const jsonData = JSON.stringify(blockedUsersData);
      return jsonData;
    } catch (error) {
      console.log(error);
    }
  }

  async handleGetFriendlist(userName: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
        include: {
          sentFriends: {
            include: {
              receivedBy: {
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

      if (!user) {
        throw new Error('User not found');
      }

      const friendList = user.sentFriends.map((friend) => friend.receivedBy);

      return JSON.stringify(friendList);
    } catch (error) {
      console.log(error);
      throw new Error('Failed to get friend list');
    }
  }

  async isPassValid(newpassdto: NewPassDto, user: User) {
    const { password, new_password } = newpassdto;

    const me = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    const isOldPassValid = await argon.verify(me.hash, password);
    if (!isOldPassValid) {
      throw new Error('Invalid current password.');
    }

    if (password === new_password) {
      throw new Error('New password must be different from the old password.');
    }

    return true;
  }

  async setNewPass(newpassdto: NewPassDto, user: User) {
    try {
      const hash = await argon.hash(newpassdto.new_password);
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          hash: hash,
        },
      });

      return { Message: 'Password Changed' };
    } catch (error) {
      throw new Error(error);
    }
  }

  async changeUsername(user: User, usernamedto: UsernameDto) {
    try {
      const exist = await this.prisma.user.findUnique({
        where: {
          nickname: usernamedto.nickname,
        },
      });
      if (exist) throw new ConflictException('username already taken');
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          nickname: usernamedto.nickname,
        },
      });
      return { Message: 'Username Changed' };
    } catch (error) {
      throw Error(error);
    }
  }

  async handleBlockUser(userID: number, blockedUserName: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userID,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const blockedUser = await this.prisma.user.findUnique({
        where: {
          nickname: blockedUserName,
        },
      });

      if (!blockedUser) {
        throw new Error('User not found');
      }

      const existingBlockedUser = await this.prisma.blockedUser.findFirst({
        where: {
          userID: user.id,
          blockedUserID: blockedUser.id,
        },
      });

      if (existingBlockedUser) {
        throw new Error('User already blocked');
      }

      const blockedUserRelation = await this.prisma.blockedUser.create({
        data: {
          user: {
            connect: {
              id: user.id,
            },
          },
          blockedUser: {
            connect: {
              id: blockedUser.id,
            },
          },
        },
      });
      return blockedUserRelation;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to block user');
    }
  }

  async handleGetFriendRequestList(userID: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userID,
      },
      include: {
        receivedFriendRequests: {
          include: {
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
    return user?.receivedFriendRequests;

    // id: number;
    // sender: User;
    // createdAt: string;
    // updatedAt: string;
    // senderID: number;
    // recipientId: number;
    // friendRequestStatus: string;
  }

  async updateAvatar(avatar: Express.Multer.File, user: User) {
    const find_user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (
      find_user.avatarUrl != 'default_avatar.png' &&
      user.provider !== 'intra'
    ) {
      fs.unlinkSync('src/avatars/uploads/' + find_user.avatarUrl);
    }

    const file_ext = avatar.originalname.split('.')[1];
    const filename = `${find_user.nickname}${find_user.id}.${file_ext}`;

    fs.renameSync(avatar.path, 'src/avatars/uploads/' + filename);
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl: filename,
      },
    });
  }

  async deleteOldTokens() {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    await this.prisma.blockedTokens.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo,
        },
      },
    });
  }

  async getAvatar(user: User, res: Response) {
    const find_user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    // console.log(path.join(__dirname, this.config.get('AVATAR_PATH')));

    //if the user has the default avatar
    if (find_user.avatarUrl === 'default_avatar.png') {
      const absolutePath = path.join(
        __dirname,
        this.config.get('DEFAULT_AVATAR_PATH'),
        user.avatarUrl,
      );
      // console.log(absolutePath);
      return res.sendFile(absolutePath);
    }
    //if the user has a custom avatar
    else {
      const absolutePath = path.join(
        __dirname,
        this.config.get('AVATAR_PATH'),
        user.avatarUrl,
      );
      // console.log(absolutePath);
      return res.sendFile(absolutePath);
    }
  }

  async getPublicAvatar(user: User, res: Response) {
    try {
      // console.log(path.join(__dirname, this.config.get('AVATAR_PATH')));

      if (!user) {
        throw new NotFoundException('user not found');
      }

      //if the user has the default avatar
      if (user.avatarUrl === 'default_avatar.png') {
        const absolutePath = path.join(
          __dirname,
          this.config.get('DEFAULT_AVATAR_PATH'),
          user.avatarUrl,
        );
        // console.log(absolutePath);
        return res.sendFile(absolutePath);
      }
      //if the user has a custom avatar
      else {
        const absolutePath = path.join(
          __dirname,
          this.config.get('AVATAR_PATH'),
          user.avatarUrl,
        );
        // console.log(absolutePath);
        return res.sendFile(absolutePath);
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async addSocket(userId: string, client: Socket) {
    const userID = parseInt(userId);

    if (!this.userSocketsMap.has(userID)) {
      this.userSocketsMap.set(userID, []);
    }

    const userSockets = this.userSocketsMap.get(userID);
    const socketExists = userSockets.some(
      (existingSocket) => existingSocket.id === client.id,
    );

    if (!socketExists) {
      userSockets.push(client);
      // this.onlineState(userID);
    }
    // console.log(this.userSocketsMap.get(userID));

    // this.onlineState(userID);
  }

  removeSocket(userId: string, client: Socket) {
    const userID = parseInt(userId);

    if (this.userSocketsMap.has(userID)) {
      const sockets = this.userSocketsMap.get(userID);
      const socketIndex = sockets.findIndex((s) => s === client);
      if (socketIndex !== -1) {
        sockets.splice(socketIndex, 1);
      }

      // if (sockets.length === 0) {
      //   this.offlineState(userID);
      // }
    }
  }

  handleAcceptInvite(player1: number, player2: number) {
    let player1Socket: Socket;
    let player2Socket: Socket;
    if (this.userSocketsMap.has(player1)) {
      const player1Sockets = this.userSocketsMap.get(player1);

      if (player1Sockets && player1Sockets.length > 0) {
        player1Socket = player1Sockets[0];
      }
    }
    if (this.userSocketsMap.has(player2)) {
      const player2Sockets = this.userSocketsMap.get(player2);

      if (player2Sockets && player2Sockets.length > 0) {
        player2Socket = player2Sockets[0];
      }
    }

    const roomID = uuidv4();

    player1Socket.emit('game:redirect', roomID);
    player2Socket.emit('game:redirect', roomID);
  }

  async sendInvite(friendID: number, sender: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: friendID,
        },
      });

      if (user.state === 'playing') {
        throw new NotFoundException('User is Playing');
      }

      if (this.userSocketsMap.has(friendID)) {
        const friendSockets = this.userSocketsMap.get(friendID);

        // console.log(friendSockets[0].id);
        if (friendSockets && friendSockets.length > 0) {
          friendSockets[0].emit('IncomingInvite', {
            sender: sender,
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.log(error);
    }
  }

  async getOtherUser(username: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          nickname: username,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.log(error);
    }
  }

  async handleGetOtherGames(userID: number) {
    try {
      const userMatches = await this.prisma.match.findMany({
        where: {
          OR: [{ player1Id: userID }, { player2Id: userID }],
        },
        include: {
          winner: true,
        },
      });

      const winCount = userMatches.reduce((count, match) => {
        if (match.winnerId === userID) {
          return count + 1;
        }
        return count;
      }, 0);

      const loseCount = userMatches.reduce((count, match) => {
        if (match.winnerId !== userID) {
          return count + 1;
        }
        return count;
      }, 0);

      const matchsTotal = userMatches.length;

      return { matches: matchsTotal, wins: winCount, loses: loseCount };
    } catch (error) {
      console.log(error);
    }
  }
}
