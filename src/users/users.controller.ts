import {
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  Delete,
  Req,
  Get,
  Patch,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { UsersService } from './users.service';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';
import { NewPassDto, UsernameDto } from 'src/auth/dto';
import { Token } from 'src/auth/decorator/token.decorator';
import { JwtBlacklistGuard } from 'src/auth/guard/jwt-blacklist.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import * as sharp from 'sharp';
import * as fs from 'fs';

@UseGuards(JwtBlacklistGuard)
@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(
    private userService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Patch('/upload/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      dest: './src/avatars/uploads',
      limits: {
        fileSize: 1024 * 1024 * 4,
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = /\.(jpg|jpeg|png)$/;
        if (!allowedExtensions.test(file.originalname)) {
          callback(
            new BadRequestException('Only JPEG/JPG and PNG files are allowed.'),
            false,
          );
        } else {
          callback(null, true);
        }
      },
    }),
  )
  async updateAvatar(
    @UploadedFile() avatar: Express.Multer.File,
    @GetUser() user: User,
  ) {
    try {
      const check = await sharp(avatar.path)
        .resize({ width: 200, height: 200 })
        .toBuffer();

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          isChanged: true,
        },
      });

      this.userService.updateAvatar(avatar, user);
    } catch (error) {
      console.log(error);
      return { error: error.message };
    }
  }

  @Get('my-avatar')
  @UseGuards(JwtGuard)
  getAvatar(@GetUser() user: User, @Res() res: Response) {
    try {
      if (user.provider === 'intra' && !user.isChanged) {
        return res.json(user.avatarUrl);
      } else {
        return this.userService.getAvatar(user, res);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':userId/avatar')
  async getPublicAvatar(@Param('userId') userId: string, @Res() res: Response) {
    try {
      const userID = parseInt(userId);

      const user = await this.prisma.user.findUnique({
        where: {
          id: userID,
        },
      });
      if (user.provider === 'intra' && !user.isChanged) {
        return res.json(user.avatarUrl);
      } else {
        return await this.userService.getPublicAvatar(user, res);
      }
    } catch (error) {
      console.log(error);
      res.send({ error: error.message });
    }
  }

  @Get(':username/other')
  async handleGetOtherUser(@Param('username') username: string) {
    try {
      // console.log(username);
      return await this.userService.getOtherUser(username);
    } catch (error) {
      console.log(error);
    }
  }

  @Patch('me/settings/change-username')
  async changeUsername(
    @GetUser() user: User,
    @Body() usernamedto: UsernameDto,
  ) {
    try {
      return await this.userService.changeUsername(user, usernamedto);
    } catch (error) {
      console.log(error);
      return { error: error.message };
    }
  }

  @Patch('me/settings/new-password')
  async changePass(@GetUser() user: User, @Body() newpassdto: NewPassDto) {
    try {
      const isPassValid = await this.userService.isPassValid(newpassdto, user);
      if (!isPassValid) throw new ForbiddenException('incorrect password');
      return await this.userService.setNewPass(newpassdto, user);
    } catch (error) {
      return error.message;
    }
  }

  @Get('all-users')
  async handleGetAllUsers() {
    return this.userService.handleGetAllUsers();
  }

  @Get('me')
  getMe(@GetUser() user: User) {
    try {
      delete user.TwofaAutSecret;
      return user;
    } catch (error) {
      console.log(error);
    }
  }

  @Post(':username/send-friend-request')
  async handleSendFriendRequest(
    @Param(`username`) userName: string,
    @Body() data: { recipientUserName: string },
  ) {
    try {
      return await this.userService.handleSendFriendRequest(
        userName,
        data.recipientUserName,
      );
    } catch (error) {
      console.log(error);
    }
  }

  @Get('friend-request-list')
  async handleGetFriendList(@GetUser() user: User) {
    try {
      return await this.userService.handleGetFriendRequestList(user.id);
    } catch (error) {
      console.log(error);
    }
  }

  @Post('/friend-request/:sender/accept')
  async handleAcceptFriendRequest(
    @GetUser() reciever: User,
    @Param('sender') senderUserame: string,
  ) {
    try {
      await this.userService.handleAcceptFriendRequest(
        senderUserame,
        reciever.nickname,
      );
    } catch (error) {
      console.log(error);
    }

    // console.log('Reciever Username : ', reciever.nickname);
    // console.log('Sender Username : ', senderUserame);
  }

  @Delete('remove-friend/:username')
  async handleRemoveFriend(
    @Param('username') userName: string,
    @GetUser() user: User,
  ) {
    try {
      return await this.userService.handleRemoveFriend(userName, user.id);
    } catch (error) {
      console.log(error);
    }
  }

  @Post(':username/reject')
  async handleRejectFriendRequest(
    @GetUser() user: User,
    @Param('username') sender: string,
  ) {
    try {
      return await this.userService.handleRejectFriendRequest(
        user.nickname,
        sender,
      );
    } catch (error) {
      console.log(error);
    }
  }

  @Post(':username/cancel-request')
  async handleCancelFriendRequest(
    @GetUser() user: User,
    @Param('username') username: string,
  ) {
    try {
      await this.userService.handleCancelFriendRequest(user.id, username);
      return { message: 'Friend request cancelled' };
    } catch (error) {
      console.log(error);
    }
  }

  @Post(':username/block-user')
  async handleBlockUser(
    @Param('username') username: string,
    @GetUser() user: User,
  ) {
    try {
      return await this.userService.handleBlockUser(user.id, username);
    } catch (error) {
      console.log(error);
      return { error: error.message };
    }
  }

  @Get(':username/profile')
  async handleGetProfile(
    @GetUser() user: User,
    @Param('username') userName: string,
  ) {
    try {
      const publicProfile = await this.userService.handleGetProfile(
        userName,
        user.id,
      );
      return publicProfile;
    } catch (error) {
      console.log(error);
    }
  }

  @Delete(':username/:blockedusername/unblock')
  async handleUnblockUser(
    @Param('username') userName: string,
    @Param('blockedusername') blocked: string,
  ) {
    try {
      return await this.userService.handleUnblockUser(userName, blocked);
    } catch (error) {
      console.log(error);
    }
  }

  @Get('blockedusers')
  async handleGetBlockedUsers() {
    try {
      return this.userService.handleGetBlockedUsers();
    } catch (error) {
      console.log(error);
    }
  }

  @Get('friendlist')
  async handleGetFriendlist(@GetUser() user: User) {
    try {
      return this.userService.handleGetFriendlist(user.nickname);
    } catch (error) {
      console.log(error);
    }
  }

  @Get('logout')
  async logout(@GetUser() user: User, @Token() token) {
    try {
      await this.userService.addToBlockedTokens(token);
    } catch (error) {
      console.log(error);
    }
  }
}
