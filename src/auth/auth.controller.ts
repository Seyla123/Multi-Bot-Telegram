import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller(['auth', 'api/auth', 'api/user'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body(new ValidationPipe()) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get(['me', 'profile'])
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    const userId = req.user?.id;
    return this.authService.getProfile(userId);
  }

  @Put(['profile', 'me'])
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true })) updateDto: UpdateProfileDto,
  ) {
    const userId = req.user?.id;
    return this.authService.updateProfile(userId, updateDto);
  }

  @Patch(['profile', 'me'])
  @UseGuards(JwtAuthGuard)
  async patchProfile(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true })) updateDto: UpdateProfileDto,
  ) {
    const userId = req.user?.id;
    return this.authService.updateProfile(userId, updateDto);
  }

  @Put(['change-password', 'password'])
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true })) changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.id;
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Post(['change-password', 'password'])
  @UseGuards(JwtAuthGuard)
  async postChangePassword(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true })) changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.id;
    return this.authService.changePassword(userId, changePasswordDto);
  }
}
