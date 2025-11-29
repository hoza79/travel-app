import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsEnum,
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

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt({ message: 'Seats must be a number' })
  seatsAvailable: number;

  @IsString()
  description: string;

  @IsEnum(['Offering', 'Searching'], {
    message: 'Type must be Offering or Searching',
  })
  type: 'Offering' | 'Searching';
}
