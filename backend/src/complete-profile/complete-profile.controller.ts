import { Controller, Post, Body, Req } from '@nestjs/common';
import { CompleteProfileService } from './complete-profile.service';
import { CreateCompleteProfileDto } from './dto/create-complete-profile.dto';

@Controller('profile')
export class CompleteProfileController {
  constructor(
    private readonly completeProfileService: CompleteProfileService,
  ) {}

  @Post('setup')
  async setup(@Req() req, @Body() dto: CreateCompleteProfileDto) {
    // You pass the token manually, so extract userId from request header manually:
    const token = req.headers.authorization?.split(' ')[1];

    // decode token (VERY light decoding, same as your login/register do)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    const userId = payload.id;

    return this.completeProfileService.completeProfile(userId, dto);
  }
}
