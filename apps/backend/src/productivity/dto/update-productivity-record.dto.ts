import { PartialType } from '@nestjs/swagger';
import { CreateProductivityRecordDto } from './create-productivity-record.dto';

export class UpdateProductivityRecordDto extends PartialType(CreateProductivityRecordDto) {}
