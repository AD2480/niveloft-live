# Niveloft: going live

Niveloft is two parts that are deployed separately:

| Part | What it is | Where it goes |
| --- | --- | --- |
| `frontend/` | The website and the app (React) | **Vercel** (free tier is fine) |
| `backend/` | The server: accounts, projects, plans and UPI payments (Java + MySQL) | **Railway** (or any host that runs a Dockerfile and MySQL) |

The live site has **no demo mode**: every account, project and payment is stored on your server.
Contact address: **dobhalaaryam@gmail.com**. Payments go to UPI ID **dobhalaaryam-2@okhdfcbank**.
Both are already the defaults in the code, so you only change them if they change.

---

## 0. Before you deploy (on your computer, once)

The code was prepared without being able to run the build tools, so check it builds first:

```bash
# from the repository root
npm ci --include=dev
npm run typecheck && npm test && npm run build

# the server (needs Java 21)
cd backend
./mvnw test
```

Fix anything these report before going further. (The server's Docker image skips the tests, so a
deploy never fails because of a test; run them here instead.)

---

## 1. Put the code on GitHub

Extract the ZIP and upload its **contents** (not the ZIP) to a GitHub repository with Git, so the
hidden files (`.gitignore`, `.github/`, `frontend/.env.development`) come along:

```bash
git init
git add .
git commit -m "Niveloft: live release"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

---

## 2. The server on Railway

1. In Railway: **New project → Deploy from GitHub repo**, pick your repository, and set the
   service's **Root directory** to `backend`. Railway finds `backend/Dockerfile` and `railway.json`.
2. In the same project: **New → Database → MySQL**.
3. On the backend service: **Settings → Volumes → Add volume**, mount path `/app/data`
   (uploaded evidence files live there; without a volume they're lost on every deploy).
4. On the backend service: **Settings → Networking → Generate domain**. Note the address, e.g.
   `https://niveloft-api.up.railway.app`.
5. On the backend service, **Variables** (Raw editor), paste and fill in:

```text
DB_URL=jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=utf8
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}

# Generate once with:  openssl rand -base64 48   (keep it secret, never change it casually)
JWT_SECRET=PASTE_A_LONG_RANDOM_SECRET

# Your website's address on Vercel (step 3), no trailing slash
APP_URL=https://YOUR-SITE.vercel.app
CORS_ALLOWED_ORIGINS=https://YOUR-SITE.vercel.app

REQUIRE_HTTPS=true
TRUSTED_PROXIES=1
DEMO_DATA=false
PROJECTFLOW_ZONE=Asia/Kolkata

# Who runs the site, where messages go, and where customers pay (these are the defaults already)
OPERATOR_EMAILS=dobhalaaryam@gmail.com
CONTACT_EMAIL=dobhalaaryam@gmail.com
BILLING_UPI_ID=dobhalaaryam-2@okhdfcbank
BILLING_PAYEE_NAME=Niveloft

# Email (strongly recommended, see step 4)
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
EMAIL_FROM=Niveloft <no-reply@YOUR-DOMAIN>
EMAIL_REPLY_TO=dobhalaaryam@gmail.com
```

Deploy. When it's healthy, `https://YOUR-API-DOMAIN/actuator/health` shows `{"status":"UP"}`.

---

## 3. The website on Vercel

1. **Add New → Project**, import the same repository. Leave the **Root Directory** as the
   repository root; `vercel.json` sets the build.
2. **Settings → Environment Variables** (Production):

```text
VITE_API_BASE_URL=https://YOUR-API-DOMAIN/api
VITE_SITE_URL=https://YOUR-SITE.vercel.app
VITE_OPERATOR_NAME=Your legal name or business name
VITE_CONTACT_EMAIL=dobhalaaryam@gmail.com
```

3. Deploy. The build stops with a clear message if `VITE_API_BASE_URL` is missing, so the live
   site can never come up without its server.
4. If you add your own domain later, update `VITE_SITE_URL` here and `APP_URL` /
   `CORS_ALLOWED_ORIGINS` on Railway, then redeploy both.

---

## 4. Email (Resend, free tier)

Email is what sends password resets, confirms new accounts, tells you when a customer has paid,
and tells customers their plan is active. Without it the site works, but none of that is sent.

1. Create an account at resend.com, add and verify your domain (or use their test sender while
   trying things out: it only delivers to your own address).
2. Create an API key and put it in `EMAIL_API_KEY` on Railway, with `EMAIL_FROM` on that domain.

With email on, new accounts must confirm their address before signing in, and your admin access
also needs a confirmed address.

---

## 5. Right after the first deploy

1. **Create your own account at once** with **dobhalaaryam@gmail.com** (Start free). That address
   is the site's administrator; registering it first means nobody else can.
2. Open the account menu (bottom of the sidebar): **Admin → Payments to check** should open.
3. Test a payment end to end: from another account, choose Pro, pay ₹999 to yourself from a
   different UPI account, enter the UTR, then approve it in **Payments to check**. The other
   account's **Settings → Plan and billing** shows Pro. (Refund yourself as you like; it's your money.)

4. Optional: in GitHub, **Settings → Secrets and variables → Actions → Variables**, add
   `FRONTEND_URL` (your site) and `BACKEND_URL` (your API, without /api). The Uptime workflow then
   checks both every 15 minutes and emails you if either is down.

---

## 6. How payments work, day to day

- A customer picks a plan in **Settings → Plan and billing**, scans the QR code (or taps "Pay with
  a UPI app" on a phone), pays, and types the 12-digit **UTR** from their app.
- You get an email "Payment to check". Open your bank or UPI app, find that UTR, check the amount
  (and the order reference in the note), then **Approve** in **Payments to check**. If it isn't
  there, **Reject** with a reason; the customer is emailed the reason.
- Approving switches the plan on at once. Plans don't renew by themselves; customers get a
  reminder email a week before theirs ends.
- Prices and limits live in two places that must match:
  `backend/src/main/java/dev/projectflow/billing/Plan.java` and
  `frontend/src/features/public/pricing.ts`.

Things to know about taking payments to a personal UPI ID:

- **No automatic confirmation.** A personal UPI ID has no API, so every payment is checked by you.
  If volume grows, move to a payment gateway (Razorpay, Cashfree, PhonePe PG) for automatic
  confirmation; the billing code is built so that can be added later.
- **Limits and flags.** Banks and UPI apps cap daily UPI amounts and may flag frequent business
  receipts into a personal account. A UPI business/merchant account from your bank avoids that.
- **Taxes.** Keep records of every payment (the Payments page keeps them). Check with an accountant
  about GST registration and invoices once your revenue approaches the threshold.
- **Refunds.** The terms (`/terms#plans`) promise a refund when a payment can't be confirmed or was
  made twice or for the wrong amount. Change that section of
  `frontend/src/pages/public/LegalPages.tsx` if your policy is different.

---

## 7. Running it on your computer (development)

```bash
npm ci --include=dev
npm run dev            # http://localhost:5174 with an in-browser test API (development only)
```

Against the real server instead: start MySQL (`cd backend && docker compose up -d`), the server
(`./mvnw spring-boot:run`, set `DEMO_DATA=true` for sample data), then `npm run dev:api --prefix frontend`.
