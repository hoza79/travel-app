import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('interest_requests')
export class InterestRequestsController {
  constructor(
    private readonly interestRequestsService: InterestRequestsService,
  ) {}

  @Post()
  create(
    @Req() req,
    @Body() createInterestRequestDto: CreateInterestRequestDto,
  ) {
    const userId = verifyToken(req);

    if (userId === createInterestRequestDto.ownerId) {
      throw new BadRequestException(
        'You cannot request interest on your own trip',
      );
    }

    return this.interestRequestsService.create(
      createInterestRequestDto,
      userId,
    );
  }

  @Get('status/:tripId')
  getStatus(@Param('tripId') tripId: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.getStatus(+tripId, userId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.acceptRequest(+id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestRequestsService.remove(+id);
  }
}
