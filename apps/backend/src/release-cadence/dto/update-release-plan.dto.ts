import { PartialType } from '@nestjs/swagger';
import { CreateReleasePlanDto } from './create-release-plan.dto';

export class UpdateReleasePlanDto extends PartialType(CreateReleasePlanDto) {}
