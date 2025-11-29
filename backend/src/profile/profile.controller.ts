import { Controller, Get, Param, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // GET /profile/me
  @Get('me')
  async getMyProfile(@Req() req) {
    const userId = verifyToken(req);
    return this.profileService.getProfileByUserId(userId);
  }

  // GET /profile/:id
  @Get(':id')
  async getProfileById(@Param('id') id: string) {
    const profileId = Number(id);
    return this.profileService.getProfileByUserId(profileId);
  }
}
