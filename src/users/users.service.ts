import { ConflictException, Injectable, UseGuards } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.scheduleDataCleanup();
  }

  private scheduleDataCleanup() {
    const job = new CronJob('0 0 * * *', async () => {
      try {
        await this.deleteOldTokens();
      } catch (error) {
        console.error('Error deleting blocked users:', error);
      }
    });

    // Start the cron job
    job.start();
  }

  async handleGetAllUsers() {
    const users = await this.prisma.user.findMany();
    return users.map(({ hash, TwofaAutSecret, ...rest }) => rest);
  }

  async addToBlockedTokens(token: string): Promise<void> {
    await this.prisma.blockedTokens.create({ data: { token } });
  }

  async onlineState(user: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        state: 'online',
      },
    });
  }

  async offlineState(user: User) {
    await this.prisma.user.update({
      where: {
        id: user.id,
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

      // Delete the friend request
      await this.prisma.friendRequest.delete({
        where: {
          id: friendRequest.id,
        },
      });

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
      });
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
                  nickname: true,
                  state: true,
                  avatarUrl: true,
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
    const verify = await argon.verify(user.hash, newpassdto.password);
    if (verify) return true;
    return false;
  }

  async setNewPass(newpassdto: NewPassDto, user: User) {
    const hash = await argon.hash(newpassdto.new_password);
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        hash: hash,
      },
    });
  }

  async changeUsername(user: User, usernamedto: UsernameDto) {
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
                nickname: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    return user?.receivedFriendRequests;
  }

  async updateAvatar(avatar: Express.Multer.File, user: User) {
    const find_user = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    //delete the old avatar if there is a one other than the default
    if (find_user.avatarUrl != 'default_avatar.png') {
      fs.unlinkSync('src/avatars/uploads/' + find_user.avatarUrl);
    }
    //give the new avatar a name (username + id + .ext)
    const file_ext = avatar.originalname.split('.')[1]; //the ext of the new avatar file
    const filename = `${find_user.nickname}${find_user.id}.${file_ext}`;
    //rename the new avatar file
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

  // async getAvatar(user: User, res: Response) {
  //   const find_user = await this.prisma.user.findUnique({
  //     where: {
  //       id: user.id,
  //     },
  //   });

  //   // console.log(path.join(__dirname, this.config.get('AVATAR_PATH')));

  //   //if the user has the default avatar
  //   if (find_user.avatarUrl === 'default_avatar.png') {
  //     const absolutePath = path.join(
  //       __dirname,
  //       this.config.get('DEFAULT_AVATAR_PATH'),
  //       user.avatarUrl,
  //     );
  //     // console.log(absolutePath);
  //     return res.sendFile(absolutePath);
  //   }
  //   //if the user has a custom avatar
  //   else {
  //     const absolutePath = path.join(
  //       __dirname,
  //       this.config.get('AVATAR_PATH'),
  //       user.avatarUrl,
  //     );
  //     // console.log(absolutePath);
  //     return res.sendFile(absolutePath);
  //   }
  // }
}
