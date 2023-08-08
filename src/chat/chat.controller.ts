import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';

@UseGuards(JwtGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('createroom')
  async handleCreateRoom(@GetUser() user: User, @Body() data: any) {
    const { userID, password, isProtected, isPrivate, isGroup, members, name } =
      data;

    // console.log(userID);
    // console.log(isGroup);
    // console.log(members);
    // console.log(name);

    // this.chatService.handleCreateRoom(data.roomName, user.id);

    try {
      if (isGroup) {
        // this.chatService.createGroupRoom(name, members);
      } else if (isPrivate) {
        // this.chatService.createPrivateRoom(name, members);
      } else if (isProtected) {
        // this.chatService.createProtectedRoom(name, members, password);
      } else {
        return this.chatService.handleCreateRoom(userID, user.id);
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':roomid/messages')
  async handleGetRoomMessages(@Param('roomid') roomId: string) {
    try {
      return await this.chatService.handleGetRoomMessages(roomId);
    } catch (error) {
      console.log(error);
    }
  }

  @Post('send-message')
  async handleSendMessage(@GetUser() user: User, @Body() data: any) {
    try {
      const { RoomId, message } = data;

      return await this.chatService.handleSendMessage(user.id, RoomId, message);
    } catch (error) {
      console.log(error);
    }
  }

  @Get('my-chats')
  async handleGetMyChats(@GetUser() user: User) {
    try {
      return await this.chatService.handleGetMyChats(user.id);
    } catch (error) {
      console.log(error);
    }
  }

  @Post('setadmin')
  async handleSetAdmin(
    @Req() req: Request,
    @Body() data: { roomId: number; userId: number },
  ) {
    const requestingUser = parseInt(
      await this.chatService.extractUserIdFromHeader(req),
      10,
    );

    console.log(data.roomId, data.userId);
    await this.chatService.handleSetAdmin(
      data.roomId,
      data.userId,
      requestingUser,
    );
  }
}
