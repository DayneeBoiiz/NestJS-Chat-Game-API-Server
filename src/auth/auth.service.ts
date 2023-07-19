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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  async findUser(id: number) {
    const user = this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    console.log(user);
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
        },
      });

      const response = await this.signToken(NewUser.id, NewUser.email);
      return response;
    }

    const response = await this.signToken(user.id, user.email);
    return response;
  }

  async register(dto: AuthDtoRegister) {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: hash,
          nickname: dto.nickname,
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
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const isMatch = await argon.verify(user.hash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }
    return this.signToken(user.id, user.email);
  }

  async signToken(
    userId: number,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };

    const secret = this.config.get('JWT_SECRET');

    const ret = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: secret,
    });

    return {
      access_token: ret,
    };
  }
}
