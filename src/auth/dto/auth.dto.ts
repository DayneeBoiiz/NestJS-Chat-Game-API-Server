import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AuthDtoRegister {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, {
    message: 'Password is too short. Minimum length is 6 characters.',
  })
  @MaxLength(20, {
    message: 'Password is too long. Maximum length is 20 characters.',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  nickname: string;
}

export class AuthDtoLogin {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UsernameDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;
}

export class NewPassDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, {
    message: 'Password is too short. Minimum length is 6 characters.',
  })
  @MaxLength(20, {
    message: 'Password is too long. Maximum length is 20 characters.',
  })
  new_password: string;
}
