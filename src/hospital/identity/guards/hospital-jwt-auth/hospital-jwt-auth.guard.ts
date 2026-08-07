import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class HospitalJwtAuthGuard extends AuthGuard('hospital-jwt') {



}