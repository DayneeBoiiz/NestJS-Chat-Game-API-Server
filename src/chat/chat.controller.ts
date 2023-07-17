import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('createroom')
  async handleCreateRoom(@Req() req: Request, @Body() data: any) {
    const userID = parseInt(
      await this.chatService.extractUserIdFromHeader(req),
      10,
    );
    this.chatService.handleCreateRoom(data.roomName, userID);
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
