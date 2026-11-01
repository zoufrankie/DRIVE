# DRIVE — Mechanic Shop Management Platform

A full-stack shop management platform for auto repair businesses. Manages clients, vehicles, invoices, jobcards, payments, appointments, and tax-ready accounting exports — with ML-based invoice line classification built in.

Built with **Next.js 16** (App Router), **TypeScript**, **React**, **Prisma**, **Auth.js**, and **Tailwind CSS**, backed by a **DistilBERT** microservice (FastAPI + PyTorch) that auto-categorizes invoice lines into 11 service categories.

---

## Features

- **Authentication** — Credential login with bcrypt password hashing, JWT session cookies via Auth.js, and server-side session checks on every protected page and API route
- **Clients** — CRUD with search, multi-owner vehicle relationships, address and referral tracking
- **Vehicles** — CRUD with VIN decoding via the NHTSA vPIC API, odometer tracking, and multi-owner support
- **Invoices** — Interactive line-item builder with per-line dirty-state tracking, cross-kind group approval, category filtering, live subtotal/tax/discount/profit calculations, and print-optimized output
- **Jobcards** — Workflow for active jobs: Start Job → Record Payment → Mark Complete, with completed jobs archived to a searchable jobcards tab
- **Payments** — Record, edit, and delete payments with automatic invoice balance/status recalculation; filter by date range, method, and work type; service breakdown per invoice
- **Appointments** — Weekly calendar with drag-to-create time blocks, click-to-edit, configurable shop opening/closing hours, and per-day column layout
- **Dashboard** — Live KPIs (revenue, payments, outstanding balance, jobs in progress, new clients) plus 12-month trend charts for revenue vs payments, new vs returning clients, invoice volume, revenue and jobs by service category, and an overdue invoices table
- **Accounting** — Tax-ready CSV export of payments with 16 columns (invoice #, client, work type, tax, subtotal, discounts, profit, VIN), date range presets (day/week/month/last month/year/custom), per-payment proration, and Excel-compatible UTF-8 encoding
- **ML Classifier** — Fine-tuned DistilBERT transformer (89.7% validation accuracy on 1,195 labeled examples) that auto-classifies invoice lines across 11 categories: BRAKES, COOLING, ELECTRICAL, ENGINE, EXHAUST, HVAC, INSPECTION, OIL, SUSPENSION, TIRES, TRANSMISSION

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 16 (App Router, Server Components, Route Handlers) |
| Language | TypeScript |
| UI | React, Tailwind CSS, Recharts |
| Database | SQLite (dev) / PostgreSQL (planned for production) |
| ORM | Prisma |
| Auth | Auth.js v5 (next-auth), bcryptjs, JWT |
| ML Service | Python, FastAPI, PyTorch, Hugging Face Transformers |
| External APIs | NHTSA vPIC (VIN decode) |

---

## Architecture

The Next.js app calls the FastAPI classifier on line save and line edit to auto-populate each invoice line's `category` field. If the classifier is unreachable, lines save with a null category and can be classified later via the reclassify script.

```
Next.js App (port 3000) --> FastAPI Classifier (port 8001) --> classifier_model/
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.10+ (only needed for the ML classifier)
- SQLite (comes preinstalled with Prisma)

### Setup

```bash
git clone https://github.com/zoufrankie/DRIVE.git
cd DRIVE
npm install

# Create .env and set:
#   DATABASE_URL="file:./dev.db"
#   NEXTAUTH_SECRET="<openssl rand -base64 32>"
#   AUTH_SECRET="<same value>"
#   NEXTAUTH_URL="http://localhost:3000"

npx prisma db push
npx prisma generate
npx prisma db seed
# Login: admin@shop.com / password123

npm run dev
```

Open http://localhost:3000 and sign in with admin@shop.com / password123.

### ML Classifier (optional)
Without this running, invoice lines save with a null category and the dashboard's service charts stay empty.

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python train_classifier.py
uvicorn classifier_api:app --host 0.0.0.0 --port 8001 --reload
```
## Project Structure

```
app/
  (protected)/      Routes behind authentication
    home/           Active jobcards grid
    clients/        Client CRUD
    vehicles/       Vehicle CRUD + VIN decode
    invoices/       Invoice builder + jobcard workflow
    jobcards/       Archive of completed jobs
    payments/       Payment records + filters
    appointments/   Weekly calendar
    accounting/     Tax export
    dashboard/      KPIs + charts
    settings/       Shop config
  api/              REST API routes
    auth/           Auth.js handler
    clients/        Client CRUD
    vehicles/       Vehicle CRUD + odometer
    invoices/       Invoice + line item endpoints
    payments/       Payment CRUD
    appointments/   Appointment CRUD
    accounting/     CSV export
    dashboard/      Aggregation endpoint
    classify-line/  Proxy to FastAPI classifier
    vin/decode/     NHTSA VIN decoder

components/         Reusable React components
lib/                Prisma singleton, payment helpers
prisma/             Schema + seed script
ml-service/         DistilBERT classifier (FastAPI + PyTorch)
```
## Roadmap
- [x] Authentication with bcrypt + JWT
- [x] Client and vehicle management
- [x] Invoice builder with line items
- [x] Jobcard workflow (Start, Pay, Complete)
- [x] Payment recording with edit/delete
- [x] DistilBERT classifier + auto-tagging
- [x] Appointments calendar
- [x] Dashboard analytics
- [x] Tax-ready accounting export
- [ ] Deploy to Vercel + PostgreSQL
- [ ] End-to-end tests for API routes

## License
MIT
