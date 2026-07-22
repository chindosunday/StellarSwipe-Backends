import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

export interface WsAuthenticatedUser extends JwtPayload {
  sub: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    this.validateSocket(client);
    return true;
  }

  validateSocket(client: Socket): WsAuthenticatedUser {
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user: WsAuthenticatedUser = { ...payload, sub: payload.sub };
    client.data = client.data ?? {};
    client.data.user = user;
    client.data.walletAddress = user.sub;

    return user;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return this.stripBearerPrefix(authToken);
    }

    const authorizationHeader = this.resolveAuthorizationHeader(client);
    if (authorizationHeader) {
      return this.stripBearerPrefix(authorizationHeader);
    }

    return null;
  }

  private resolveAuthorizationHeader(client: Socket): string | null {
    const headers = client.handshake.headers ?? {};
    const rawHeader = headers.authorization ?? headers.Authorization;
    if (Array.isArray(rawHeader)) {
      return rawHeader[0] ?? null;
    }

    return typeof rawHeader === 'string' && rawHeader.trim().length > 0
      ? rawHeader
      : null;
  }

  private stripBearerPrefix(token: string): string {
    return token.replace(/^Bearer\s+/i, '').trim();
  }
}
