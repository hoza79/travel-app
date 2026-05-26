import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsEnum,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  from: string;

  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  to: string;

  @IsNotEmpty({ message: 'Please enter a valid date' })
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsAvailable: number;

  @IsString()
  description: string;

  @IsEnum(['Offering', 'Searching'], {
    message: 'Type must be Offering or Searching',
  })
  type: 'Offering' | 'Searching';

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destinationLat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destinationLng: number;
}
