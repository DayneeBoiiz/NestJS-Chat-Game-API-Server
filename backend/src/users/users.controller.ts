import {
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  Delete,
  Req,
  Get,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { UsersService } from './users.service';
import { Request } from 'express';

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('all-users')
  async handleGetAllUsers() {
    return this.userService.handleGetAllUsers();
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

  @Post(':senderusername/friend-request/:receiverusername/accept')
  async handleAcceptFriendRequest(
    @Param('senderusername') senderUserName: string,
    @Param('receiverusername') recieverUserName: string,
  ) {
    await this.userService.handleAcceptFriendRequest(
      senderUserName,
      recieverUserName,
    );
  }

  @Delete(':username')
  async handleRemoveFriend(
    @Param('username') userName: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization;
    const requestingUserID = await this.userService.extratUserIdFromHeader(
      token,
    );
    return await this.userService.handleRemoveFriend(
      userName,
      requestingUserID,
    );
  }

  @Post('reject')
  async handleRejectFriendRequest(
    @Body() data: { userID: number; userName: string },
  ) {
    try {
      console.log(data.userName);
      await this.userService.handleRejectFriendRequest(
        data.userID,
        data.userName,
      );
      return { message: 'Friend request rejected' };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to reject friend request');
    }
  }

  @Post('cancel-request')
  async handleCancelFriendRequest(
    @Body() data: { userID: number; userName: string },
  ) {
    const { userID, userName } = data;

    try {
      await this.userService.handleCancelFriendRequest(userID, userName);
      return { message: 'Friend request cancelled' };
    } catch (error) {
      console.log(error);
      throw new Error('Failed to cancel friend request');
    }
  }

  @Post('block-user')
  async handleBlockUser(@Body() data: { userID: number; userName: string }) {
    const { userID, userName } = data;

    try {
      return await this.userService.handleBlockUser(userID, userName);
      // return { Message: 'User Blocked' };
    } catch (error) {
      console.log(error);
      // throw new Error('Failed to block user');
    }
  }

  @Get(':username/profile')
  async handleGetProfile(@Param('username') userName: string) {
    try {
      const publicProfile = await this.userService.handleGetProfile(userName);
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

  @Get(':username/friendlist')
  async handleGetFriendlist(@Param('username') username: string) {
    try {
      return this.userService.handleGetFriendlist(username);
    } catch (error) {
      console.log(error);
    }
  }
}
