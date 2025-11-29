import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateInterestRequestDto {
  @IsNotEmpty()
  @IsNumber()
  tripId: number;

  @IsNotEmpty()
  @IsNumber()
  ownerId: number;
}
