import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePhotoDto {
  @IsNotEmpty()
  @IsString()
  photo_url: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
