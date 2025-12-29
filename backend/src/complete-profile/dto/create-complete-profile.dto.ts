import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompleteProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'Profile photo is required' })
  profile_photo: string;

  @IsString()
  @IsNotEmpty({ message: 'Cover photo is required' })
  cover_photo: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  interests?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;
}
