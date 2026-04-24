import { PartialType } from '@nestjs/swagger';
import { CreateHeadcountRecordDto } from './create-headcount-record.dto';

export class UpdateHeadcountRecordDto extends PartialType(CreateHeadcountRecordDto) {}
