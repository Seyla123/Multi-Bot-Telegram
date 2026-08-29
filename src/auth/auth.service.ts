import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  async getProfile(userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('User profile not found');
    }

    return agent;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.agent.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check if new email is already taken by another agent
    if (dto.email && dto.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailConflict = await this.prisma.agent.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (emailConflict && emailConflict.id !== userId) {
        throw new BadRequestException('Email address is already in use by another account');
      }
    }

    const updated = await this.prisma.agent.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User profile updated for ID: ${userId} (${updated.email})`);
    return updated;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: userId },
    });

    if (!agent) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, agent.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.agent.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
      },
    });

    this.logger.log(`Password successfully updated for user ID: ${userId}`);
    return { message: 'Password changed successfully' };
  }
}
