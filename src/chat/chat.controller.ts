import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { GetUser } from 'src/auth/decorator/getUser.decorator';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';
import { MessageInputDto } from './dto/message.dto';

@UseGuards(JwtGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('createroom')
  async handleCreateRoom(@GetUser() user: User, @Body() data: any) {
    const { userID, password, isProtected, isPrivate, isGroup, members, name } =
      data;

    try {
      if (isGroup) {
        return this.chatService.createGroupRoom(name, members, user.id);
      } else if (isProtected) {
        return this.chatService.createProtectedRoom(
          name,
          members,
          password,
          user.id,
        );
      } else if (isPrivate) {
        return this.chatService.createPrivateRoom(name, members, user.id);
      } else {
        return this.chatService.handleCreateRoom(userID, user.id);
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  @Post('leave-room')
  async handleLeaveRoom(@GetUser() user: User, @Body() data: any) {
    const { conversationId } = data;

    try {
      return await this.chatService.handleLeaveRoom(conversationId, user.id);
    } catch (error) {
      console.log(error);
      return { error: error.message };
    }
  }

  @Post('join-room')
  async handleJoinRoom(
    @GetUser() user: User,
    @Body() data: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const {
      conversationId,
      isProtected,
      isPrivate,
      isGroup,
      roomKey,
      password,
    } = data;

    try {
      if (isGroup) {
        return await this.chatService.joinPublicRoom(conversationId, user.id);
      } else if (isPrivate) {
        return await this.chatService.joinPrivateRoom(user.id, roomKey);
      } else if (isProtected) {
        return await this.chatService.joinProtectedRoom(
          conversationId,
          user.id,
          password,
        );
      }
    } catch (error) {
      res.status(HttpStatus.UNAUTHORIZED);
      return { error: error.message };
    }
  }

  @Get('my-rooms')
  async handleGetMyRooms(@GetUser() user: User) {
    try {
      return await this.chatService.handleGetMyRooms(user.id);
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':roomtype/all')
  async handleGetRooms(@Param('roomtype') roomType: string) {
    try {
      if (roomType === 'isGroup') {
        return await this.chatService.getPublicRooms();
      } else if (roomType === 'isProtected') {
        return await this.chatService.getProtectedRooms();
      } else if (roomType === 'isPrivate') {
        // return await this.chatService.getPrivateRooms();
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Get(':roomId/other-user')
  async handleGetOtherUser(
    @Param('roomId') conversationID: string,
    @GetUser() user: User,
  ) {
    try {
      return await this.chatService.getOtherUser(conversationID, user);
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

  @Get(':roomid/messages')
  async handleGetRoomMessages(@Param('roomid') roomId: string) {
    try {
      return await this.chatService.handleGetRoomMessages(roomId);
    } catch (error) {
      console.log(error);
    }
  }

  @Post('send-message')
  async handleSendMessage(
    @GetUser() user: User,
    @Body() data: MessageInputDto,
  ) {
    try {
      const { RoomId, message } = data;

      return await this.chatService.handleSendMessage(user.id, RoomId, message);
    } catch (error) {
      console.log(error);
    }
  }

  @Get('channel/:roomId/details')
  async haneleGetChannelDetails(
    @GetUser() user: User,
    @Param('roomId') roomId: string,
  ) {
    try {
      return await this.chatService.handleGetChannelDetails(user.id, roomId);
    } catch (error) {
      console.log(error);
    }
  }

  // @Post('setadmin')
  // async handleSetAdmin(
  //   @Req() req: Request,
  //   @Body() data: { roomId: number; userId: number },
  // ) {
  //   await this.chatService.handleSetAdmin(
  //     data.roomId,
  //     data.userId,
  //     requestingUser,
  //   );
  // }
}
