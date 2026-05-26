import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
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
  remove(@Param('id') id: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.remove(+id, userId);
  }

  @Get('accepted_count/:tripId')
  getAcceptedCount(@Param('tripId') tripId: string) {
    return this.interestRequestsService.getAcceptedCount(+tripId);
  }
}
