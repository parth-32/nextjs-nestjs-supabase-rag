import { Global, Module } from '@nestjs/common';
import { AuthGuard } from '../common/auth/auth.guard';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService, AuthGuard],
  exports: [SupabaseService, AuthGuard],
})
export class SupabaseModule {}
