-- Remove 2FA support from PlatformUser (feature dropped from scope).
ALTER TABLE "platform_users" DROP COLUMN IF EXISTS "twoFactorEnabled";
ALTER TABLE "platform_users" DROP COLUMN IF EXISTS "twoFactorSecret";
