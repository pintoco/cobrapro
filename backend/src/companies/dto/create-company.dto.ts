import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Empresa ABC S.A.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '20123456789' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  ruc?: string;

  @ApiPropertyOptional({ example: '+51 999 888 777' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Pardo 123, Lima' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;
}
