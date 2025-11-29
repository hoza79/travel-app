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
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
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
  findNearby(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.postService.findNearby(lat, lng);
  }

  @Get('user/:id')
  findByUser(@Param('id') id: number) {
    return this.postService.findByUser(id);
  }

  @Get('my-trips')
  findMyTrips(@Req() req) {
    const userId = verifyToken(req);
    return this.postService.findMyTrips(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(+id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(+id);
  }

  @Post('photo')
  createPhoto(@Req() req, @Body() createPhotoDto: CreatePhotoDto) {
    const userId = verifyToken(req);
    return this.postService.createPhoto(createPhotoDto, userId);
  }

  @Get('photos')
  getAllPhotos() {
    return this.postService.getAllPhotos();
  }
}
