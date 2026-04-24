import { PartialType } from '@nestjs/swagger';
import { CreateReleaseMilestoneDto } from './create-release-milestone.dto';

export class UpdateReleaseMilestoneDto extends PartialType(CreateReleaseMilestoneDto) {}
