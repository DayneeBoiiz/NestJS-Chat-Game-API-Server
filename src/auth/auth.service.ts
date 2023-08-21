import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDtoLogin, AuthDtoRegister } from './dto';
import { ConfigService } from '@nestjs/config';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { UserDetails } from './utils/types';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
    private userService: UsersService,
  ) {}

  async findUser(id: number) {
    const user = this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    return user;
  }

  async validateUser(details: UserDetails) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: details.email,
      },
    });

    if (!user) {
      const NewUser = await this.prisma.user.create({
        data: {
          email: details.email,
          nickname: details.login,
          avatarUrl: details.avatrURL,
          hash: '',
          provider: 'intra',
        },
      });

      const isFirstLogin = NewUser.FirstLogin;
      const returnBoolean = isFirstLogin;
      const isTwoFactorEnabled = user.TwofaAutEnabled;

      if (isFirstLogin) {
        await this.prisma.user.update({
          where: { id: NewUser.id },
          data: { FirstLogin: false },
        });
      }

      const response = await this.signToken(NewUser.id, NewUser.email);
      return {
        isTwoFactorEnabled: isTwoFactorEnabled,
        isFirstLogin: returnBoolean,
        access_token: response,
      };
    }

    const isFirstLogin = user.FirstLogin;
    const returnBoolean = isFirstLogin;
    const isTwoFactorEnabled = user.TwofaAutEnabled;

    if (isFirstLogin) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { FirstLogin: false },
      });
    }

    const response = await this.signToken(user.id, user.email);
    return {
      isTwoFactorEnabled: isTwoFactorEnabled,
      isFirstLogin: returnBoolean,
      access_token: response,
    };
  }

  async register(dto: AuthDtoRegister) {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash,
          nickname: dto.nickname,
          provider: 'email',
        },
      });
      return this.signToken(user.id, user.email);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Credentials taken...');
      }
    }
  }

  async login(dto: AuthDtoLogin) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { nickname: dto.email }],
      },
    });

    if (user.provider === 'intra') {
      throw new UnauthorizedException('This User must use Intra Login');
    }

    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isMatch = await argon.verify(user.hash, dto.password);

    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    const isFirstLogin = user.FirstLogin;
    const returnBoolean = isFirstLogin;
    const isTwoFactorEnabled = user.TwofaAutEnabled;

    if (isFirstLogin) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { FirstLogin: false },
      });
    }

    await this.userService.onlineState(user);

    const access_token = await this.signToken(user.id, user.email);
    return {
      isTwoFactorEnabled: isTwoFactorEnabled,
      isFirstLogin: returnBoolean,
      access_token: access_token,
    };
  }

  async signToken(userId: number, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
    };

    const secret = this.config.get('JWT_SECRET');

    const ret = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: secret,
    });

    return ret;
  }
}
