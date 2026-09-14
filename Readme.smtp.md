# ---- Auth / JWT ----
JWT_ACCESS_SECRET="change-me"
JWT_REFRESH_SECRET="change-me"
JWT_RESET_SECRET="change-me"

# ---- Database (Neon Postgres) ----
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
DIRECT_URL="postgresql://user:password@host/db?sslmode=require"

# ---- Email / SMTP (Gmail) ----
# Gmail requires an "App Password" (16 chars), NOT your normal account password.
# Enable 2-Step Verification, then create one at https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
MAIL_FROM="MediOps" <your-gmail@gmail.com>

# ---- Frontend ----
FRONTEND_URL=http://localhost:3000
