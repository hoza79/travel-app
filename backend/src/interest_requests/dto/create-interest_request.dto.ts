import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateInterestRequestDto {
  @Type(() => Number)
  @IsNotEmpty()
  @IsNumber()
  tripId!: number;
}
