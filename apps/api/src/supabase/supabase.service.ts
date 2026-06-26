import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/configuration';

/**
 * Thin wrapper around a single service-role Supabase client. Using the
 * service role means the API bypasses RLS, so every query MUST be explicitly
 * scoped by the authenticated user id at the application layer.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const supabase = this.config.get<AppConfig['supabase']>('supabase');
    if (!supabase) throw new Error('Supabase config missing');
    this.client = createClient(supabase.url, supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = supabase.storageBucket;
  }

  get db(): SupabaseClient {
    return this.client;
  }

  async uploadPdf(path: string, data: Buffer): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, data, { contentType: 'application/pdf', upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  }

  async downloadPdf(path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucket).download(path);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
}
