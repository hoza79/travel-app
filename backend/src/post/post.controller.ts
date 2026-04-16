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

  @Get('nearby')
  findNearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('search') search?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLat = lat ? Number(lat) : 0;
    const parsedLng = lng ? Number(lng) : 0;
    const parsedOffset = offset ? Number(offset) : 0;

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      throw new BadRequestException('Coordinates must be valid numbers');
    }

    return this.postService.findNearby(
      parsedLat,
      parsedLng,
      search,
      parsedOffset,
    );
  }

  @Get('user/:id')
  findByUser(@Param('id') id: string) {
    return this.postService.findByUser(Number(id));
  }

  @Get('my-trips')
  findMyTrips(@Req() req) {
    return this.postService.findMyTrips(verifyToken(req));
  }

  @Post('photo')
  createPhoto(@Req() req, @Body() dto: CreatePhotoDto) {
    return this.postService.createPhoto(dto, verifyToken(req));
  }

  @Get('photos')
  getAllPhotos(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.postService.getAllPhotos(
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
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
