import { Injectable, NestMiddleware, Req } from '@nestjs/common';
import { Response, NextFunction } from 'express';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  use(@Req() req: any, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.token = token;
    }
    next();
  }
}
