import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsEnum,
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
}
