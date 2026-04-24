import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@pmt.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin@2025!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
