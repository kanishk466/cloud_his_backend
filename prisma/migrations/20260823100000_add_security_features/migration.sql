ALTER TABLE "platform_users"
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "hospital_users"
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "platform_password_history" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_password_history_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "hospital_password_history" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hospital_password_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_password_history_user_id_created_at_idx" ON "platform_password_history"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "hospital_password_history_user_id_created_at_idx" ON "hospital_password_history"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_password_history_user_id_fkey') THEN
    ALTER TABLE "platform_password_history" ADD CONSTRAINT "platform_password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hospital_password_history_user_id_fkey') THEN
    ALTER TABLE "hospital_password_history" ADD CONSTRAINT "hospital_password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" TEXT NOT NULL,
  "platform_user_id" TEXT,
  "hospital_user_id" TEXT,
  "device_name" TEXT,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "auth_sessions_platform_user_id_is_active_idx" ON "auth_sessions"("platform_user_id", "is_active");
CREATE INDEX IF NOT EXISTS "auth_sessions_hospital_user_id_is_active_idx" ON "auth_sessions"("hospital_user_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_platform_user_id_fkey') THEN
    ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_hospital_user_id_fkey') THEN
    ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "login_otps" (
  "id" TEXT NOT NULL,
  "platform_user_id" TEXT,
  "hospital_user_id" TEXT,
  "otp_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_otps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "login_otps_platform_user_id_expires_at_idx" ON "login_otps"("platform_user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "login_otps_hospital_user_id_expires_at_idx" ON "login_otps"("hospital_user_id", "expires_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_otps_platform_user_id_fkey') THEN
    ALTER TABLE "login_otps" ADD CONSTRAINT "login_otps_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_otps_hospital_user_id_fkey') THEN
    ALTER TABLE "login_otps" ADD CONSTRAINT "login_otps_hospital_user_id_fkey" FOREIGN KEY ("hospital_user_id") REFERENCES "hospital_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "platform_users" SET "two_factor_enabled" = true WHERE "role" IN ('SUPER_ADMIN', 'PLATFORM_ADMIN');
