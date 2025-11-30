import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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

  // =======================================================
  // STATIC ROUTES MUST COME BEFORE :id
  // =======================================================

  @Get('nearby')
  findNearby(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;

    if (lat && Number.isNaN(parsedLat)) {
      throw new BadRequestException('lat must be a valid number');
    }
    if (lng && Number.isNaN(parsedLng)) {
      throw new BadRequestException('lng must be a valid number');
    }

    return this.postService.findNearby(parsedLat ?? 0, parsedLng ?? 0);
  }

  @Get('user/:id')
  findByUser(@Param('id') id: string) {
    const parsed = Number(id);
    if (isNaN(parsed)) {
      throw new BadRequestException('Invalid user id');
    }
    return this.postService.findByUser(parsed);
  }

  @Get('my-trips')
  findMyTrips(@Req() req) {
    const userId = verifyToken(req);
    return this.postService.findMyTrips(userId);
  }

  @Post('photo')
  createPhoto(@Req() req, @Body() createPhotoDto: CreatePhotoDto) {
    const userId = verifyToken(req);
    return this.postService.createPhoto(createPhotoDto, userId);
  }

  @Get('photos')
  getAllPhotos(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLng = lng ? Number(lng) : undefined;

    if (lat && Number.isNaN(parsedLat)) {
      throw new BadRequestException('lat must be a valid number');
    }
    if (lng && Number.isNaN(parsedLng)) {
      throw new BadRequestException('lng must be a valid number');
    }

    return this.postService.getAllPhotos(
      parsedLat ?? undefined,
      parsedLng ?? undefined,
    );
  }

  @Get('photos/:userId')
  getPhotosByUser(@Param('userId') userId: string) {
    return this.postService.getPhotosByUser(Number(userId));
  }

  // =======================================================
  // DYNAMIC ROUTE (MUST BE LAST)
  // =======================================================

  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = Number(id);

    if (!id || Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid trip id');
    }

    return this.postService.findOne(parsedId);
  }
}
