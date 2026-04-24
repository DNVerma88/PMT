import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtendSprintCalendarDto {
  @ApiProperty({ description: 'Number of additional sprints to append (1–52)', minimum: 1, maximum: 52 })
  @IsInt()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  count!: number;
}
