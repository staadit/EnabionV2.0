import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { getCookieValue } from './auth.cookies';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getCookieValue(req.headers.cookie, this.authService.getCookieName());

    if (!token) {
      throw new UnauthorizedException('Missing session');
    }

    const session = await this.authService.validateSession(token);
    req.user = session.user;
    req.sessionId = session.sessionId;

    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform admin required');
    }

    return true;
  }
}
