import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleGetAllUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(({ hash, TwofaAutSecret, ...rest }) => rest);
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

      // console.log(user, friend);

      if (user.id === friend.id) {
        throw new Error('Cannot remove yourself');
      }

      console.log(user.id);
      console.log(friend.id);

      const firstFriendship = await this.prisma.friend.findFirst({
        where: {
          sentByID: user.id,
        },
      });

      if (!firstFriendship) {
        throw new Error('Friendship not found');
      }

      const secondFriendship = await this.prisma.friend.findFirst({
        where: {
          sentByID: friend.id,
        },
      });

      if (!secondFriendship) {
        throw new Error('Friendship not found');
      }

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

      return { message: 'Friend removed' };
    } catch (error) {
      console.log(error);
      // throw new Error('Failed to remove friend');
    }
  }

  async handleRejectFriendRequest(userID: number, userName: string) {
    try {
      const recipient = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
      });

      if (!recipient) {
        throw new Error('User not found');
      }

      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          senderID: userID,
          recipientID: recipient.id,
        },
      });

      // console.log(friendRequest);

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });
      return { message: 'Friend request rejected' };
    } catch (error) {
      console.log(error);
    }
  }

  async handleCancelFriendRequest(userID: number, userName: string) {
    try {
      const recipient = await this.prisma.user.findUnique({
        where: {
          nickname: userName,
        },
      });

      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          senderID: userID,
          recipientID: recipient.id,
        },
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });
      return { message: 'Friend request cancelled' };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to cancel friend request');
    }
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

      return { senderID: sender.id, recieverID: reciever.id };
    } catch (error) {
      console.log(error);
    }
  }

  async handleAcceptFriendRequest(
    senderUserName: string,
    recieverUserName: string,
  ) {
    // console.log('recieverUserName --> ', senderUserName);
    // console.log('recieverUserName ==> ', recieverUserName);

    // console.log(senderUserName);
    // console.log(recieverUserName);
    const { senderID, recieverID } = await this.getUsersId(
      senderUserName,
      recieverUserName,
    );

    // console.log(senderID);
    // console.log(recieverID);

    try {
      const friendRequest = await this.prisma.friendRequest.findFirst({
        where: {
          senderID: senderID,
          recipientID: recieverID,
        },
      });

      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      await this.prisma.friend.createMany({
        data: [
          {
            sentByID: senderID,
            receivedByID: recieverID,
          },
          {
            sentByID: recieverID,
            receivedByID: senderID,
          },
        ],
      });

      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  // DayneeBoiiz "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoic2FhZC5heWFyQGhvdG1haWwuY29tIiwiaWF0IjoxNjg3MDc5NDA1LCJleHAiOjE2ODcxNjU4MDV9.x_rOO1VEOmcKHKmxFyPXHSmw2XHyA5CTv1K6PwGMofs"
  // FixGree "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoic2FhZC5heWFyQGhvdG1haWwuZnIiLCJpYXQiOjE2ODcwNzk0MjYsImV4cCI6MTY4NzE2NTgyNn0._Ky7DM4My9t1MO9L6-ieVI-d8ruY_LXtGaM7fE6EhRg"

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
      });
      return { message: 'Friend request sent' };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to send friend request');
    }
  }

  async handleGetProfile(userName: string) {
    const publicProfile = await this.prisma.user.findUnique({
      where: {
        nickname: userName,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });

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
                  nickname: true,
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

  async updateAvatar(avatar: Express.Multer.File, user: User) {
    const find_user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    //delete the old avatar if there is a one other than the default
    if (find_user.avatarUrl != 'default_avatar.png') {
      fs.unlinkSync('src/users/avatars/' + find_user.avatarUrl);
    }
    //give the new avatar a name (username + id + .ext)
    const file_ext = avatar.originalname.split('.')[1]; //the ext of the new avatar file
    const filename = `${find_user.nickname}${find_user.id}.${file_ext}`;
    //rename the new avatar file
    fs.renameSync(avatar.path, 'src/users/avatars/' + filename);
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl: filename,
      },
    });
  }

  async getAvatar(user: User, res: Response) {
    const find_user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    //if the user has the default avatar
    if (find_user.avatarUrl === 'default_avatar.png') {
      const absolutePath = path.join(
        __dirname,
        this.config.get('DEFAULT_AVATAR_PATH'),
        user.avatarUrl,
      );
      return res.sendFile(absolutePath);
    }
    //if the user has a custom avatar
    else {
      const absolutePath = path.join(
        __dirname,
        this.config.get('AVATAR_PATH'),
        user.avatarUrl,
      );
      return res.sendFile(absolutePath);
    }
  }
}
