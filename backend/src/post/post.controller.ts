import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { verifyToken } from 'src/utils/jwt.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Req() req, @Body() createPostDto: CreatePostDto) {
    const userId = verifyToken(req);
    return this.postService.create(createPostDto, userId);
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('search') search?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;
    const parsedOffset = offset ? Number(offset) : 0;

    const parsedLimit = limit ? Math.min(Number(limit), 100) : 50;

    if (parsedLat == null || parsedLng == null) {
      throw new BadRequestException('Coordinates are required');
    }

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      throw new BadRequestException('Coordinates must be valid numbers');
    }

    return this.postService.findNearby(
      parsedLat,
      parsedLng,
      search,
      parsedOffset,
      parsedLimit,
    );
  }

  @Get('route-search')
  findRouteMatches(
    @Query('originLat') originLat?: string,
    @Query('originLng') originLng?: string,
    @Query('destinationLat') destinationLat?: string,
    @Query('destinationLng') destinationLng?: string,
    @Query('pickupRadiusKm') pickupRadiusKm?: string,
    @Query('destinationRadiusKm') destinationRadiusKm?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const requiredValues = [
      originLat,
      originLng,
      destinationLat,
      destinationLng,
      pickupRadiusKm,
      destinationRadiusKm,
    ];

    if (
      requiredValues.some((value) => value == null || value.trim().length === 0)
    ) {
      throw new BadRequestException(
        'Route coordinates and distance limits are required',
      );
    }

    const parsedOriginLat = Number(originLat);
    const parsedOriginLng = Number(originLng);
    const parsedDestinationLat = Number(destinationLat);
    const parsedDestinationLng = Number(destinationLng);
    const parsedPickupRadiusKm = Number(pickupRadiusKm);
    const parsedDestinationRadiusKm = Number(destinationRadiusKm);
    const parsedOffset = offset == null ? 0 : Number(offset);
    const parsedLimit = limit == null ? 50 : Number(limit);

    if (
      !Number.isFinite(parsedOriginLat) ||
      !Number.isFinite(parsedOriginLng) ||
      !Number.isFinite(parsedDestinationLat) ||
      !Number.isFinite(parsedDestinationLng)
    ) {
      throw new BadRequestException('Coordinates must be valid numbers');
    }

    if (
      parsedOriginLat < -90 ||
      parsedOriginLat > 90 ||
      parsedDestinationLat < -90 ||
      parsedDestinationLat > 90 ||
      parsedOriginLng < -180 ||
      parsedOriginLng > 180 ||
      parsedDestinationLng < -180 ||
      parsedDestinationLng > 180
    ) {
      throw new BadRequestException('Coordinates are outside valid ranges');
    }

    if (
      !Number.isFinite(parsedPickupRadiusKm) ||
      !Number.isFinite(parsedDestinationRadiusKm) ||
      parsedPickupRadiusKm < 0 ||
      parsedDestinationRadiusKm < 0
    ) {
      throw new BadRequestException(
        'Distance limits must be valid non-negative values',
      );
    }

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('Offset must be a valid positive integer');
    }

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a valid positive integer');
    }

    return this.postService.findRouteMatches(
      parsedOriginLat,
      parsedOriginLng,
      parsedDestinationLat,
      parsedDestinationLng,
      parsedPickupRadiusKm,
      parsedDestinationRadiusKm,
      parsedOffset,
      Math.min(parsedLimit, 100),
    );
  }

  @Get('user/:id')
  findByUser(
    @Param('id') id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedId = Number(id);
    const parsedOffset = offset == null ? 0 : Number(offset);
    const parsedLimit = limit == null ? 50 : Math.min(Number(limit), 100);

    if (!Number.isInteger(parsedId) || parsedId < 1) {
      throw new BadRequestException('Invalid user id');
    }

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('Offset must be a non-negative integer');
    }

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    return this.postService.findByUser(parsedId, parsedOffset, parsedLimit);
  }

  @Get('my-trips')
  findMyTrips(
    @Req() req,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedOffset = offset == null ? 0 : Number(offset);
    const parsedLimit = limit == null ? 50 : Math.min(Number(limit), 100);

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      throw new BadRequestException('Offset must be a non-negative integer');
    }

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    return this.postService.findMyTrips(
      verifyToken(req),
      parsedOffset,
      parsedLimit,
    );
  }

  @Post('photo')
  createPhoto(@Req() req, @Body() dto: CreatePhotoDto) {
    return this.postService.createPhoto(dto, verifyToken(req));
  }

  @Get('photos')
  getAllPhotos(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedOffset = offset ? Number(offset) : 0;
    const parsedLimit = limit ? Math.min(Number(limit), 100) : 50;

    return this.postService.getAllPhotos(
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      parsedOffset,
      parsedLimit,
    );
  }

  @Get('photos/:userId')
  getPhotosByUser(@Param('userId') userId: string) {
    return this.postService.getPhotosByUser(Number(userId));
  }

  @Delete('photo/:photoId')
  deletePhoto(@Req() req, @Param('photoId') photoId: string) {
    const userId = verifyToken(req);
    const parsed = Number(photoId);

    if (Number.isNaN(parsed)) {
      throw new BadRequestException('Invalid photo id');
    }

    return this.postService.deletePhoto(parsed, userId);
  }

  @Delete(':id')
  delete(@Req() req, @Param('id') id: string) {
    const userId = verifyToken(req);
    const parsed = Number(id);

    if (Number.isNaN(parsed)) {
      throw new BadRequestException('Invalid trip id');
    }

    return this.postService.delete(parsed, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsed = Number(id);

    if (Number.isNaN(parsed)) {
      throw new BadRequestException('Invalid trip id');
    }

    return this.postService.findOne(parsed);
  }
}
