import { PartialType } from '@nestjs/mapped-types';
import { CreateInterestRequestDto } from './create-interest_request.dto';

export class UpdateInterestRequestDto extends PartialType(CreateInterestRequestDto) {}
