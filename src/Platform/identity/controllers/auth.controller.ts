// import {
//   Body,
//   Controller,
//   Post,
// } from '@nestjs/common';

// import { AuthService } from '../services/auth.service';

// import { LoginDto } from '../dto/login.dto';

// @Controller('auth')
// export class AuthController {
//   constructor(
//     private readonly authService: AuthService,
//   ) {}

//   @Post('login')
//   login(
//     @Body() dto: LoginDto,
//   ) {
//     return this.authService.login(
//       dto.email,
//       dto.password,
//     );
//   }
// }

import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns an access token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful, returns access token',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }




@Post('logout')
logout(
  @Body()
  dto: RefreshTokenDto,
) {
  return this.authService.logout(
    dto.refreshToken,
  );
}

@Post('refresh')
refresh(
  @Body()
  dto: RefreshTokenDto,
) {
  return this.authService.refresh(
    dto.refreshToken,
  );
}

 @ApiBearerAuth('access-token') 
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@Request() req) {
  return req.user;
}
  


}

