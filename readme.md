# Berry Studio API

Express.js REST API for the **Berry Studio** digital printables shop (Next.js frontend in `shopberrystudio`).

MongoDB persistence, JWT auth, product CRUD with optional Cloudinary uploads, client-side cart checkout, reviews, support messages, favorites, and admin dashboard stats.

Responses use the compact field names expected by `lib/berry/api.ts` / `lib/berry/types.ts` (`t`, `p`, `e`, `n`, `i`, …).

---

## Features

| Area | Description |
|------|-------------|
| **Products** | Catalog of digital downloads; numeric `id` for cart/favorites; images + downloadable `files` |
| **Auth** | Register, login, demo Google continue; JWT Bearer; roles `Admin` / `Client` |
| **Orders** | Checkout posts cart `items`; no shipping — digital delivery; purchases & downloads |
| **Reviews / Messages** | Product reviews; 3-day support chat thread |
| **Dashboard** | Money received, top sellers, calendar week + year sales series |

Cart state stays on the **client**. Checkout sends `{ items: [{ productId, quantity }] }`.

---

## Setup

```bash
cd "shopberrystudio backend"
npm install
```

Create `.env` (do not commit secrets):

| Variable | Purpose |
|----------|---------|
| `uri` | MongoDB connection string |
| `secretKey` | JWT signing secret |
| `PORT` | Optional; default `5000` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | Upload folder (default `shopberrystudio`) |

```bash
npm run seed   # catalog + admin user
npm run dev    # http://localhost:5000
```

Seeded admin: `khadidja@berrystudio.example` / `Admin123!`

---

## Frontend connection

In the Next.js app `.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

`lib/berry/api.ts` calls this base URL for all endpoints below.

---

## API overview

| Prefix | Purpose |
|--------|---------|
| `/product` | List / get / create / update / delete products |
| `/user` | Auth, profile, favorites, notifications, admin users |
| `/order` | Checkout, my purchases, downloads, dashboard stats |
| `/review` | List / add reviews |
| `/message` | Support messages |

See **[spec.md](./spec.md)** for method tables and response shapes.

---

## Tech stack

- Node.js (CommonJS) · Express 5 · MongoDB / Mongoose  
- JWT + bcrypt · Multer (memory) + Cloudinary · CORS · serverless-http (Netlify)
