import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: '+15555550123' })
  @IsOptional()
  @IsString()
  @MaxLength(24)
  phone?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token issued at login/refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: ['BORROWER', 'REALTOR', 'LOAN_OFFICER', 'ADMIN'] })
  role!: 'BORROWER' | 'REALTOR' | 'LOAN_OFFICER' | 'ADMIN';
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT (15 min) for Authorization: Bearer' })
  accessToken!: string;

  @ApiProperty({ description: 'Long-lived opaque token; rotates on every refresh' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
