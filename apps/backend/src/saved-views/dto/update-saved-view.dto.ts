import { PartialType } from '@nestjs/swagger';
import { CreateSavedViewDto } from './create-saved-view.dto';

export class UpdateSavedViewDto extends PartialType(CreateSavedViewDto) {}
