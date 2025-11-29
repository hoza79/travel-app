import { PartialType } from '@nestjs/mapped-types';
import { CreateCompleteProfileDto } from './create-complete-profile.dto';

export class UpdateCompleteProfileDto extends PartialType(CreateCompleteProfileDto) {}
