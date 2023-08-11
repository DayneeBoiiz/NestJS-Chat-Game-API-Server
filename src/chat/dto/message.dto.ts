import { IsNotEmpty, IsString } from 'class-validator';

export class MessageInputDto {
  @IsNotEmpty({ message: 'Content cannot be empty.' })
  @IsString({ message: 'Content must be a string.' })
  message: string;

  @IsNotEmpty({ message: 'Content cannot be empty.' })
  @IsString({ message: 'Content must be a string.' })
  RoomId: string;
}
