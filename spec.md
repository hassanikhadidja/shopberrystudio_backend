# Berry Studio Backend — Technical Specification

API for the **Berry Studio** digital printables marketplace. Aligns with the Next.js frontend (`shopberrystudio`) contract in `lib/berry/api.ts` and `lib/berry/types.ts`.

There is **no shipping / wilaya / delivery fee** flow — products are instant digital downloads.

---

## 1. Purpose

- Catalog and admin CRUD for printable products  
- JWT accounts (`Admin` / `Client`)  
- Client-side cart → server checkout  
- Purchases, downloads, reviews, support messages, favorites, notifications  
- Admin dashboard aggregates (revenue, top sellers, week/month sales)

---

## 2. Layout

```
shopberrystudio backend/
├── index.js / app.js
├── config/          # MongoDB, Cloudinary
├── controlles/      # Handlers (folder name kept for imports)
├── middlewares/     # Auth, admin, validators
├── models/          # product, user, order, review, message
├── routes/
├── scripts/seed.js  # Catalog + users matching frontend demo data
└── utils/           # multer, productMap, nextProductId
```

---

## 3. Compact response shapes (frontend)

**Product** (`toFrontendProduct`):

| FE | DB |
|----|-----|
| `id` | `id` (number) |
| `t` | `title` |
| `r` | `ratingLabel` |
| `p` / `o` | `price` / `originalPrice` |
| `e` / `c` | `emoji` / `gradient` |
| `b` | `bestseller` |
| `imgs` / `files` | `images` / `files` |
| `code` | `code` (`BS-001` style, 3 digits) |
| `pdf` / `tags` / `d` / `cu` | `pdfCount` / `tags` / `description` / `custom` |

**User** (`toFrontendUser`): `n`, `e`, `r`, `o` (orderCount), `g` (google), plus `favorites`, `notif`, `_id`.

**Purchase:** `{ i: productId, ts }` (extras allowed).

**Review:** `{ i, s, t, d, n?, im? }`.

**Message:** `{ f: "o"|"u", t, ts }`.

---

## 4. Auth (JWT)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/user/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/user/login` | `{ email, password }` → `{ token, user }` |
| POST | `/user/google` | `{ credential }` (Google ID token, verified against `GOOGLE_CLIENT_ID`) → `{ token, user }`. Email-only demo works only when `GOOGLE_CLIENT_ID` is unset and `NODE_ENV` is not `production`. |
| GET | `/user/getcurrentuser` | Bearer |
| PATCH | `/user/me/notifications` | `{ notif }` |
| POST | `/user/me/favorites/:productId` | Toggle |
| GET | `/user/` | Admin list |
| POST | `/user/admin` | Admin create user |
| PATCH | `/user/:id` | Self or admin |
| DELETE | `/user/:id` | Admin; keeps ≥1 Admin |

Header: `Authorization: Bearer <token>`. Roles: `Admin` | `Client`.

---

## 5. Products

| Method | Path | Auth |
|--------|------|------|
| GET | `/product/` | Public — `Product[]` |
| GET | `/product/:id` | Public — numeric `id` or Mongo `_id` |
| POST | `/product/` | Admin — JSON **or** multipart `files` |
| PATCH | `/product/:id` | Admin — JSON body; `keepImgs` / `images`; optional multipart |
| DELETE | `/product/:id` | Admin |

JSON create body (from dashboard / `createProductRequest`):

`title`, `code`, `price`, `originalPrice`, `description`, `pdfCount`, `tags`, `bestseller`, `images`, `files`, `custom`.

Multipart images/documents go to Cloudinary (`CLOUDINARY_FOLDER`). Documents are appended to `files[]` with `{ id, name, kind, source, href, size }`.

---

## 6. Cart & orders

Cart is **client-only**. Checkout:

`POST /order/` (optional Bearer)  
Body: `{ items: [{ productId, quantity }] }`  
→ `{ msg, purchases, order }` — status defaults to `paid` (downloadable).

| Method | Path | Auth |
|--------|------|------|
| GET | `/order/mine` | Bearer — `{ purchases }` |
| GET | `/order/downloads` | Bearer — files for paid orders |
| GET | `/order/dashboard` | Admin — stats below |
| GET/PATCH/DELETE | `/order/…` | Admin order management |

**Dashboard** (`GET /order/dashboard`):

- `moneyReceived` — Σ `price * salesCount`  
- `topSellers` — top 5 `{ id, title, sold, revenue, emoji }`  
- `weekSales` — **7 numbers**, calendar Mon→Sun (same as frontend `weekSales`)  
- `monthSales` — **12 numbers**, Jan→Dec of current year (same as frontend `monthSales`)

No `/order/config`, delivery fees, or address fields.

---

## 7. Reviews & messages

| Method | Path | Auth |
|--------|------|------|
| GET | `/review/?productId=` | Public |
| POST | `/review/` | Bearer — `{ productId, rating, text, name, images }` |
| GET | `/message/` | Bearer — last 3 days + welcome printable message |
| POST | `/message/` | Bearer — `{ text }` |

---

## 8. Environment

| Variable | Used by |
|----------|---------|
| `uri` | MongoDB |
| `secretKey` | JWT |
| `PORT` | Default `5000` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Uploads |
| `CLOUDINARY_FOLDER` | Default `shopberrystudio` |

Frontend: `NEXT_PUBLIC_API_URL=http://localhost:5000`.

---

## 9. Seed

`npm run seed` upserts catalog ids **1–8** (matches `lib/berry/catalog.ts` + `SALES`), codes `BS-001`…`BS-008`, and demo users including Admin `khadidja@berrystudio.example`.
