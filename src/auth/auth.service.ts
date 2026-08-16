import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { email: loginDto.email },
    });

    if (!agent) {
      this.logger.warn(`Failed login attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, agent.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(`Failed password attempt for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: agent.id, email: agent.email, role: agent.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      data: {
        accessToken,
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
        },
      },
    };
  }
}
