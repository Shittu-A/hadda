# Hadda School — Full Rebuild Specification
### TypeScript · Next.js · Supabase · Vercel

> This document is the single source of truth for rebuilding the Hadda School management system
> from scratch. It captures every feature, every data model, the exact design system, and a
> phased implementation plan. The original codebase is Laravel 11 + MySQL; the target is
> Next.js 14 (App Router) + Supabase (PostgreSQL) + Vercel.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design System & Color Theme](#2-design-system--color-theme)
3. [Tech Stack](#3-tech-stack)
4. [User Roles & Authentication](#4-user-roles--authentication)
5. [Database Schema](#5-database-schema)
6. [Feature Specifications](#6-feature-specifications)
   - 6.1 Public Landing Page
   - 6.2 Public Events Page
   - 6.3 Parent Payment Portal
   - 6.4 Academic Year Management
   - 6.5 Class Management
   - 6.6 Student Enrollment & Management
   - 6.7 Student Attendance
   - 6.8 Teacher Attendance
   - 6.9 Leave Request Management
   - 6.10 Memorization (Hifz) Tracking
   - 6.11 Fee Management
   - 6.12 Promotions & Year-End Processing
   - 6.13 Alumni Management
   - 6.14 Reports & Exports
   - 6.15 Audit Logging
   - 6.16 App Settings
   - 6.17 User Management (Super Admin)
   - 6.18 Events Management (Super Admin)
   - 6.19 Notifications
7. [Route Map](#7-route-map)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Project Overview

**App name:** Hadda School (Hafiz Academy)
**Tagline:** "Where Hearts Meet the Quran" / "Where Every Heart Finds Its Verse"
**Mission:** A Quran memorization school (Hifz academy) that tracks student progress from
enrollment through graduation (becoming a Hafiz/Hafiza).

### What this app does

- Three staff portals: **Super Admin**, **Admin**, **Teacher** — each with their own
  dashboard and feature set
- One **public-facing** site: landing page, events listing, parent fee payment portal
- Tracks every student's Quran memorization progress (sabaq / sabqi / manzil sessions)
- Manages school fees, discounts, and integrates with Paystack & Flutterwave for online payment
- Handles end-of-year class promotions (promoted / retained / graduated / withdrawn / transferred)
- Maintains a full audit trail of all admin actions for compliance

### Scale expectations
- ~500 students, ~30 teachers
- Daily attendance records grow O(students × school_days); plan for archival after 5+ years
- Memorization logs: 3 sessions/day × students × 300 school_days/year

---

## 2. Design System & Color Theme

### Color Palette — "Coffee"

The entire UI uses a single warm brown/coffee palette. No secondary accent colors.

```js
// tailwind.config.ts — extend.colors
coffee: {
  50:  '#FDF8F0',   // page background (warm off-white)
  100: '#F7EDD8',   // body background, card backgrounds
  200: '#E8D5B0',   // borders, dividers, subtle backgrounds
  300: '#D4B08A',   // muted borders, decorative blobs
  400: '#C4956A',   // icon color on dark, muted text on dark
  500: '#A0652D',   // section labels, muted body text
  600: '#7C4A1E',   // body text, paragraph text
  700: '#5C2D0E',   // list item text, link text
  800: '#3D1A08',   // (rarely used directly)
  900: '#2C1206',   // primary dark — nav bg, buttons, headings, footer
}
```

### Usage Rules

| Element | Class(es) |
|---|---|
| Page body background | `bg-coffee-100 text-coffee-900` |
| Section background (alternate) | `bg-coffee-50` |
| Navigation / footer background | `bg-coffee-900` |
| Primary button | `bg-coffee-900 text-coffee-100 hover:bg-coffee-800` |
| Outline button | `border-2 border-coffee-300 text-coffee-700 hover:border-coffee-500` |
| Card | `bg-white border border-coffee-200 rounded-2xl` |
| Card hover | `hover:border-coffee-400 hover:shadow-md` |
| Dark card (quote blocks) | `bg-coffee-900 text-coffee-200` |
| Section label (eyebrow text) | `text-xs font-semibold uppercase tracking-widest text-coffee-500` |
| Page heading | `text-coffee-900 font-bold` |
| Body / paragraph text | `text-coffee-600` |
| Muted / secondary text | `text-coffee-500` |
| Icon container (light) | `bg-coffee-100 rounded-xl` with `text-coffee-700` icon |
| Icon container (dark) | `bg-coffee-900 rounded-full` with `text-coffee-300` icon |
| Sidebar active link | `bg-coffee-900 text-white` |
| Sidebar hover | `hover:bg-coffee-100` |
| Badge — success/active | `bg-green-100 text-green-700` |
| Badge — warning/pending | `bg-yellow-100 text-yellow-700` |
| Badge — danger/absent | `bg-red-100 text-red-700` |
| Badge — info | `bg-blue-100 text-blue-700` |
| Badge — neutral/graduated | `bg-coffee-100 text-coffee-700` |

### Typography

- **Font family:** Figtree (Google Fonts / Bunny Fonts)
- **Weights used:** 300, 400, 500, 600, 700, 800
- **Base:** `font-sans antialiased`
- **Headings:** `font-bold` or `font-extrabold`
- **Hero h1:** `text-5xl sm:text-6xl font-extrabold`
- **Section h2:** `text-4xl font-bold`
- **Card h3:** `text-lg font-bold`

### Layout

- Max content width: `max-w-6xl mx-auto px-6`
- Corner radius for cards: `rounded-2xl`
- Corner radius for buttons: `rounded-xl`
- Corner radius for badges/pills: `rounded-full` or `rounded-lg`
- Blur/glow decorative blobs: `rounded-full blur-3xl opacity-30 pointer-events-none`
- Section vertical padding: `py-24`

### Sidebar Layout (Admin/Teacher portals)

```
┌──────────────────────────────────────────────────┐
│  [Logo] Hadda School          [User] [Notif bell] │  ← top nav
├────────────────┬─────────────────────────────────┤
│                │                                  │
│  Sidebar nav   │   Main content area              │
│  (w-64)        │   (flex-1, p-6 or p-8)           │
│                │                                  │
│  fixed/sticky  │   scrollable                     │
└────────────────┴─────────────────────────────────┘
```

---

## 3. Tech Stack

```
Next.js 14          App Router, Server Components, Server Actions
TypeScript          Strict mode
Supabase            PostgreSQL database + Auth (or NextAuth.js)
Prisma              ORM — type-safe DB access
Tailwind CSS        Styling (same config as Laravel version)
Figtree             Font (Google Fonts)
NextAuth.js         Authentication & role-based sessions (if not using Supabase Auth)
react-pdf           PDF report generation (serverless-compatible)
xlsx                Excel export
Paystack JS SDK     Payment gateway
Flutterwave JS SDK  Payment gateway
Zod                 Input validation (replaces Laravel Form Requests)
React Hook Form     Form state management
date-fns            Date formatting/manipulation
Vercel              Hosting (free tier)
```

### Project Structure

```
/
├── app/
│   ├── (public)/              ← landing, events, payment portal
│   ├── (auth)/                ← login page
│   ├── (admin)/               ← admin dashboard + features
│   │   ├── layout.tsx         ← admin shell (sidebar + topnav)
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── classes/
│   │   ├── attendance/
│   │   ├── fees/
│   │   ├── memorization/
│   │   ├── promotions/
│   │   ├── alumni/
│   │   └── reports/
│   ├── (teacher)/             ← teacher portal
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── memorization/
│   │   └── leave/
│   └── (super-admin)/         ← super admin portal
│       ├── layout.tsx
│       ├── dashboard/
│       ├── users/
│       ├── academic-years/
│       ├── events/
│       ├── settings/
│       └── audit-logs/
├── components/
│   ├── ui/                    ← reusable primitives (Button, Badge, Card, etc.)
│   ├── layout/                ← Sidebar, Topnav, Footer
│   └── features/              ← domain-specific components
├── lib/
│   ├── db.ts                  ← Prisma client singleton
│   ├── auth.ts                ← NextAuth config
│   ├── services/              ← business logic (FeeService, MemorizationService, etc.)
│   ├── validations/           ← Zod schemas
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                ← Surah data seeder
└── public/
```

---

## 4. User Roles & Authentication

### Roles

| Role | Access |
|---|---|
| `super_admin` | Everything — user management, academic years, settings, audit logs, all admin features |
| `admin` | Student management, classes, attendance, fees, memorization (view), promotions, reports |
| `teacher` | Their own class attendance, memorization logs, leave requests |

### Auth Rules

- All `/admin/*`, `/teacher/*`, `/super-admin/*` routes require an authenticated session
- `super_admin` can access all `/admin/*` routes (is a superset of admin)
- `teacher` can only access `/teacher/*`
- Unauthenticated users are redirected to `/login`
- **Inactive users** (`is_active = false`) are rejected even if their session is valid — show a
  "Your account has been deactivated" message
- No public registration — only super_admin can create user accounts
- Password reset via email link

### Session data to store

```ts
session.user = {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'teacher'
  isActive: boolean
}
```

### Route guard middleware (`middleware.ts`)

```
/admin/*       → requires role: admin OR super_admin
/teacher/*     → requires role: teacher (or admin/super_admin for testing)
/super-admin/* → requires role: super_admin only
```

---

## 5. Database Schema

### Prisma Schema

```prisma
// ─── Core ──────────────────────────────────────────────────────────────────

model User {
  id                 String   @id @default(cuid())
  name               String
  email              String   @unique
  passwordHash       String
  role               Role     @default(teacher)
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  taughtClasses      ClassTeacher[]
  teacherAttendances TeacherAttendance[]
  leaveRequests      LeaveRequest[]     @relation("LeaveRequester")
  reviewedLeaves     LeaveRequest[]     @relation("LeaveReviewer")
  memorizationLogs   MemorizationLog[]
  auditLogs          AuditLog[]
  notifications      Notification[]
  recordedAttendances StudentAttendance[]
}

enum Role { super_admin admin teacher }

model AcademicYear {
  id         String    @id @default(cuid())
  name       String
  startDate  DateTime
  endDate    DateTime
  isCurrent  Boolean   @default(false)
  createdAt  DateTime  @default(now())

  classes    ClassRoom[]
  students   Student[]
  memLogs    MemorizationLog[]
  promotionsFrom Promotion[] @relation("FromYear")
  promotionsTo   Promotion[] @relation("ToYear")
  feeStructures  FeeStructure[]
}

// ─── Classes & Students ────────────────────────────────────────────────────

model ClassRoom {
  id             String   @id @default(cuid())
  name           String
  description    String?
  capacity       Int?
  order          Int      @default(0)
  academicYearId String
  createdAt      DateTime @default(now())

  academicYear   AcademicYear    @relation(fields: [academicYearId], references: [id])
  teachers       ClassTeacher[]
  students       Student[]
  attendances    StudentAttendance[]
  feeAssignments FeeAssignment[]
  promotionsFrom Promotion[]    @relation("FromClass")
  promotionsTo   Promotion[]    @relation("ToClass")
}

model ClassTeacher {
  classId   String
  userId    String
  isPrimary Boolean  @default(false)

  class     ClassRoom @relation(fields: [classId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([classId, userId])
}

model Student {
  id              String        @id @default(cuid())
  admissionNumber String        @unique  // HMS-YYYY-NNNN
  firstName       String
  lastName        String
  dateOfBirth     DateTime?
  enrollmentDate  DateTime
  photoUrl        String?
  address         String?
  status          StudentStatus @default(active)
  currentClassId  String?
  academicYearId  String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?     // soft delete

  currentClass    ClassRoom?    @relation(fields: [currentClassId], references: [id])
  academicYear    AcademicYear  @relation(fields: [academicYearId], references: [id])
  guardians       Guardian[]
  attendances     StudentAttendance[]
  feeAssignments  FeeAssignment[]
  feePayments     FeePayment[]
  feeDiscounts    FeeDiscount[]
  memorizationLogs MemorizationLog[]
  promotions      Promotion[]
}

enum StudentStatus { active promoted graduated withdrawn transferred }

model Guardian {
  id           String       @id @default(cuid())
  studentId    String
  name         String
  phone        String?
  email        String?
  relationship Relationship
  isPrimary    Boolean      @default(false)

  student      Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
}

enum Relationship { Father Mother Guardian }

// ─── Attendance ────────────────────────────────────────────────────────────

model StudentAttendance {
  id           String           @id @default(cuid())
  studentId    String
  classId      String
  recordedById String
  date         DateTime         @db.Date
  status       AttendanceStatus
  note         String?

  student      Student  @relation(fields: [studentId], references: [id])
  class        ClassRoom @relation(fields: [classId], references: [id])
  recordedBy   User     @relation(fields: [recordedById], references: [id])

  @@unique([studentId, date])
}

model TeacherAttendance {
  id           String                @id @default(cuid())
  userId       String
  recordedById String
  date         DateTime              @db.Date
  status       TeacherAttendStatus
  note         String?

  user         User @relation(fields: [userId], references: [id])

  @@unique([userId, date])
}

enum AttendanceStatus      { present absent late excused }
enum TeacherAttendStatus   { present absent late on_leave }

// ─── Leave Requests ────────────────────────────────────────────────────────

model LeaveRequest {
  id           String      @id @default(cuid())
  userId       String
  startDate    DateTime
  endDate      DateTime
  reason       String
  status       LeaveStatus @default(pending)
  reviewedById String?
  reviewNote   String?
  reviewedAt   DateTime?
  createdAt    DateTime    @default(now())

  user         User @relation("LeaveRequester", fields: [userId], references: [id])
  reviewedBy   User? @relation("LeaveReviewer", fields: [reviewedById], references: [id])
}

enum LeaveStatus { pending approved rejected }

// ─── Memorization (Hifz) ──────────────────────────────────────────────────

model Surah {
  id          Int    @id   // 1–114
  nameArabic  String
  nameEnglish String
  juzStart    Int
  ayahCount   Int

  logsFrom    MemorizationLog[] @relation("FromSurah")
  logsTo      MemorizationLog[] @relation("ToSurah")
}

model MemorizationLog {
  id             String         @id @default(cuid())
  studentId      String
  teacherId      String
  academicYearId String
  logDate        DateTime       @db.Date
  type           MemLogType
  surahFromId    Int
  ayahFrom       Int
  surahToId      Int
  ayahTo         Int
  pages          Decimal        @db.Decimal(5, 2)
  quality        MemLogQuality
  notes          String?
  createdAt      DateTime       @default(now())

  student        Student      @relation(fields: [studentId], references: [id])
  teacher        User         @relation(fields: [teacherId], references: [id])
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  surahFrom      Surah        @relation("FromSurah", fields: [surahFromId], references: [id])
  surahTo        Surah        @relation("ToSurah", fields: [surahToId], references: [id])

  @@index([studentId, logDate, type])
}

enum MemLogType    { sabaq sabqi manzil }
enum MemLogQuality { excellent good average weak }

// ─── Fee Management ────────────────────────────────────────────────────────

model FeeStructure {
  id             String       @id @default(cuid())
  academicYearId String
  name           String
  amount         Decimal      @db.Decimal(10, 2)
  frequency      FeeFrequency
  isActive       Boolean      @default(true)
  description    String?
  createdAt      DateTime     @default(now())

  academicYear   AcademicYear  @relation(fields: [academicYearId], references: [id])
  assignments    FeeAssignment[]
  payments       FeePayment[]
  discounts      FeeDiscount[]
}

model FeeAssignment {
  id             String  @id @default(cuid())
  feeStructureId String
  studentId      String?  // null = class-level assignment
  classId        String?  // null = student-level assignment
  createdAt      DateTime @default(now())

  feeStructure   FeeStructure @relation(fields: [feeStructureId], references: [id])
  student        Student?     @relation(fields: [studentId], references: [id])
  class          ClassRoom?   @relation(fields: [classId], references: [id])
}

model FeePayment {
  id             String        @id @default(cuid())
  studentId      String
  feeStructureId String
  recordedById   String
  amountPaid     Decimal       @db.Decimal(10, 2)
  paymentDate    DateTime
  paymentMethod  PaymentMethod
  reference      String?
  period         String?       // e.g. "January 2025"
  note           String?
  createdAt      DateTime      @default(now())

  student        Student      @relation(fields: [studentId], references: [id])
  feeStructure   FeeStructure @relation(fields: [feeStructureId], references: [id])
}

model FeeDiscount {
  id             String       @id @default(cuid())
  studentId      String
  feeStructureId String
  discountType   DiscountType
  value          Decimal      @db.Decimal(10, 2)  // percent (0–100) or fixed amount
  reason         String?
  createdAt      DateTime     @default(now())

  student        Student      @relation(fields: [studentId], references: [id])
  feeStructure   FeeStructure @relation(fields: [feeStructureId], references: [id])

  @@unique([studentId, feeStructureId])
}

enum FeeFrequency  { monthly termly yearly one_time }
enum PaymentMethod { cash bank_transfer online other }
enum DiscountType  { fixed percent }

// ─── Promotions ────────────────────────────────────────────────────────────

model Promotion {
  id                  String          @id @default(cuid())
  studentId           String
  fromAcademicYearId  String
  toAcademicYearId    String
  fromClassId         String?
  toClassId           String?
  outcome             PromotionOutcome
  processedById       String
  notes               String?
  createdAt           DateTime        @default(now())

  student             Student      @relation(fields: [studentId], references: [id])
  fromAcademicYear    AcademicYear @relation("FromYear", fields: [fromAcademicYearId], references: [id])
  toAcademicYear      AcademicYear @relation("ToYear", fields: [toAcademicYearId], references: [id])
  fromClass           ClassRoom?   @relation("FromClass", fields: [fromClassId], references: [id])
  toClass             ClassRoom?   @relation("ToClass", fields: [toClassId], references: [id])

  @@unique([studentId, fromAcademicYearId])
}

enum PromotionOutcome { promoted retained graduated withdrawn transferred }

// ─── Payment Portal ────────────────────────────────────────────────────────

model PaymentIntent {
  id                String        @id @default(cuid())
  reference         String        @unique  // HADDA-DATE-RANDOM
  provider          PaymentProvider
  guardianPhone     String?
  amount            Decimal       @db.Decimal(10, 2)
  items             Json          // array of fee items being paid
  status            PaymentIntentStatus @default(pending)
  providerReference String?
  metadata          Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

enum PaymentProvider     { paystack flutterwave }
enum PaymentIntentStatus { pending success failed abandoned }

// ─── Admin & System ───────────────────────────────────────────────────────

model AuditLog {
  id             String   @id @default(cuid())
  userId         String?
  action         String   // e.g. "student.created", "fee.payment.recorded"
  auditableType  String?  // e.g. "Student"
  auditableId    String?
  oldValues      Json?
  newValues      Json?
  description    String?
  ipAddress      String?
  createdAt      DateTime @default(now())

  user           User? @relation(fields: [userId], references: [id])

  @@index([auditableType, auditableId])
  @@index([action])
  @@index([createdAt])
}

model Setting {
  id        String      @id @default(cuid())
  key       String      @unique
  value     String?
  group     SettingGroup
  label     String
  type      SettingType
  options   Json?       // for select type: [{label, value}]
}

enum SettingGroup { general school finance sms }
enum SettingType  { text number boolean select textarea }

model Notification {
  id         String   @id @default(cuid())
  userId     String
  type       String
  data       Json
  readAt     DateTime?
  createdAt  DateTime @default(now())

  user       User @relation(fields: [userId], references: [id])
}

model Event {
  id          String   @id @default(cuid())
  title       String
  description String?
  youtubeUrl  String
  eventDate   DateTime
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 6. Feature Specifications

---

### 6.1 Public Landing Page

**Route:** `/`
**Auth:** None (public)

**Sections (top to bottom):**

1. **Navbar** — fixed, `bg-coffee-50/90 backdrop-blur`, logo + school name left, "Events" link +
   "Staff Login" button right
2. **Hero** — centered, decorative blobs background. H1 "Where Every Heart Finds Its Verse".
   Two CTAs: "Pay School Fees" (→ `/pay`) and "Learn More" (scroll anchor)
3. **Stats Bar** — `bg-coffee-900`. 4 stats: 500+ Students · 120+ Graduates · 30+ Teachers · 10+
   Years. Stats are hardcoded marketing numbers, not DB queries
4. **About Section** — two columns: mission text + bullet points left, Hadith quote card right
   (dark coffee card with Arabic quote)
5. **Features Grid** — 6 feature cards (3-col grid): Daily Progress Tracking, Small Classes,
   Safe Environment, Tajweed Excellence, Graduated Promotion, Transparent Fee Management
6. **Events Section** — only shown if events exist. Shows 3 most recent published events as
   YouTube embed cards with date + title. "See All Events" button → `/events`
7. **Testimonial / CTA** — dark `bg-coffee-900` rounded block. Parent quote + "Pay Fees Online"
   and "Staff Portal" buttons
8. **Footer** — `bg-coffee-900`. Logo left, copyright center, two links right

**Data needed:** 3 most recent published `Event` records

---

### 6.2 Public Events Page

**Route:** `/events`
**Auth:** None (public)

- Same navbar + footer as landing page
- Grid of ALL published events, paginated (12 per page)
- Each card: YouTube embed (aspect-video), event date, title, description (line-clamp-2)
- YouTube URL → embed URL conversion:
  - `https://www.youtube.com/watch?v=ID` → `https://www.youtube.com/embed/ID`
  - `https://youtu.be/ID` → `https://www.youtube.com/embed/ID`
  - `https://www.youtube.com/embed/ID` → unchanged

---

### 6.3 Parent Payment Portal

**Routes:** `/pay` (lookup form), `/pay/initiate` (POST), `/pay/callback` (GET)
**Webhooks:** `/api/webhooks/paystack` (POST), `/api/webhooks/flutterwave` (POST)
**Auth:** None (public)

**Flow:**

```
1. Parent visits /pay
2. Enters student admission number (HMS-YYYY-NNNN format) OR guardian phone number
3. System looks up student + outstanding fees (class-level + student-level, minus discounts)
4. Shows fee breakdown with total amount due
5. Parent clicks "Pay Now" → system creates PaymentIntent record
6. Redirect to Paystack/Flutterwave checkout
7. Payment provider redirects back to /pay/callback?reference=HADDA-...
8. System verifies payment with provider API → marks PaymentIntent as success
9. Creates FeePayment record(s)
10. Shows success screen with receipt summary
```

**Webhook handling (for delayed/background confirmations):**
- `POST /api/webhooks/paystack` → verify HMAC signature → process charge.success event
- `POST /api/webhooks/flutterwave` → verify signature → process payment webhook
- Both webhooks are idempotent: check if PaymentIntent already = success before processing

**Fee calculation logic (replicate FeeService):**

```ts
// For a given student, get all applicable fees:
// 1. Student-level FeeAssignments for this student
// 2. Class-level FeeAssignments for the student's current class
// Deduplicate by feeStructureId
// For each fee: apply FeeDiscount if exists (fixed = amount - value, percent = amount * (1 - value/100))
// Sum net amounts = total outstanding
```

---

### 6.4 Academic Year Management

**Routes:** `/super-admin/academic-years`
**Access:** super_admin only

- Table of all academic years: Name · Start Date · End Date · Current? · Actions
- **Create:** name, start date, end date
- **Set as Current:** marks selected year as `isCurrent = true`, sets all others to `false`
  (must be transactional)
- **Delete:** only allowed if no students are enrolled under that year
- Business rule: only one academic year can be current at a time

---

### 6.5 Class Management

**Routes:** `/admin/classes`
**Access:** admin, super_admin

- Table of classes for the current academic year, ordered by `order` field
- Each row: Name · Capacity · Student Count · Primary Teacher · Actions
- **Create class:** name, description, capacity, order, select academic year (defaults to current)
- **Edit class:** same fields + assign/remove teachers (multi-select with is_primary toggle)
- **Delete class:** only if no active students assigned
- **View class:** shows class roster (list of enrolled students) + assigned teachers
- `studentCount` = count of students where `currentClassId = class.id` and `deletedAt IS NULL`
- `isFull` = `studentCount >= capacity`

---

### 6.6 Student Enrollment & Management

**Routes:** `/admin/students`
**Access:** admin, super_admin

#### Student List (with live search)

- Search bar (filters by first name, last name, admission number)
- Filter by class (dropdown) and status (active / promoted / graduated / withdrawn / transferred)
- Paginated table: Admission No · Name · Class · Status · Enrollment Date · Actions
- Soft-deleted students are hidden from main list

#### Create Student

Fields:
- First name, Last name (required)
- Date of birth
- Enrollment date (required, defaults to today)
- Photo upload (stored in Supabase Storage)
- Address
- Status (default: active)
- Current class (select from current year's classes)
- **Guardians** (1–3): name, phone, email, relationship (Father/Mother/Guardian), is_primary checkbox

Admission number is **auto-generated**: `HMS-{currentYear}-{4-digit-sequence}` — query the DB
for the max sequence number for this year and increment.

#### View Student

Shows:
- Student info + photo
- Guardian contact details
- Current class + academic year
- Attendance summary (present/absent/late/excused counts)
- Recent memorization logs (last 10)
- Fee ledger (per fee structure: amount due, paid, outstanding)
- Promotion history

#### Edit Student

- Same fields as create
- Can change status, class assignment
- Add/remove/edit guardians

#### Delete Student (soft delete)

- Sets `deletedAt` timestamp
- Student disappears from active lists but record is preserved
- Alumni list shows students with status = graduated/withdrawn/transferred

---

### 6.7 Student Attendance

**Routes:** `/admin/attendance/students`, `/teacher/attendance`
**Access:** Teacher portal (take attendance), Admin portal (view only)

#### Teacher: Take Attendance

- Teacher selects their class + date (defaults to today)
- System checks if attendance already recorded for that class+date
- Shows roster of all active students in the class
- For each student: status radio/select (present / absent / late / excused) + optional note
- **Bulk save** all records at once (upsert — unique on [studentId, date])

#### Admin: View Attendance

- Filter by class + date range
- Summary stats: Present · Absent · Late · Excused
- Per-student absence rate (absences / total school days)
- Export to Excel

#### Attendance history (teacher view)

- Teacher sees their own past attendance submissions by date

---

### 6.8 Teacher Attendance

**Routes:** `/admin/attendance/teachers`
**Access:** admin, super_admin

- Admin manually records teacher attendance per day
- Table of all teachers with today's status (or blank if not yet recorded)
- Statuses: present / absent / late / on_leave
- Optional note per teacher
- Date picker to view/edit past dates
- Unique constraint: one record per [userId, date]

---

### 6.9 Leave Request Management

**Routes:**
- `/teacher/leave` — teacher submits and views own requests
- `/admin/leave-requests` — admin views all pending requests + approve/reject

#### Teacher: Submit Leave Request

Fields: start date, end date, reason (textarea)

After submission: creates Notification for all admin/super_admin users (type: `new_leave_request`)

#### Teacher: View Own Requests

Table: Date range · Reason · Status badge · Reviewer · Review note

#### Admin: Manage Requests

- Tabs or filter: Pending / Approved / Rejected
- Each row: Teacher name · Date range · Reason · Status · Actions
- **Approve:** sets status = approved, reviewedById = current user, reviewedAt = now
- **Reject:** modal with required review_note field, then same fields set
- After decision: creates Notification for the requesting teacher (type: `leave_request_decided`)

---

### 6.10 Memorization (Hifz) Tracking

**Routes:**
- `/teacher/memorization` — teacher logs sessions for their students
- `/admin/memorization` — admin views all logs (read-only)
- `/admin/students/{id}` — student detail shows their logs

#### Session Types

| Type | Arabic | Meaning |
|---|---|---|
| `sabaq` | سبق | New lesson (today's new memorization) |
| `sabqi` | سبقی | Recent revision (last few days) |
| `manzil` | منزل | Long-term revision (older portions) |

#### Quality Ratings

| Value | Label |
|---|---|
| `excellent` | Excellent |
| `good` | Good |
| `average` | Average |
| `weak` | Weak / Needs Work |

#### Log a Session (Teacher)

Fields:
- Student (select from teacher's class roster)
- Date (defaults to today)
- Session type (sabaq / sabqi / manzil)
- Surah from + Ayah from
- Surah to + Ayah to
- Pages (decimal, e.g. 1.5)
- Quality rating
- Notes (optional)

Surah selector: dropdown of all 114 Surahs with Arabic + English names

#### View Student Progress

- Progress summary: total pages memorized (sabaq), total pages revised (sabqi + manzil)
- Breakdown by type (sabaq / sabqi / manzil) with page counts
- Filterable log table: date, type, surah range (e.g. "Al-Baqarah 1–5"), pages, quality, teacher
- Surah range display: "Surah Name (Ayah X) → Surah Name (Ayah Y)"

#### Surah reference seed data (all 114)

The database must be pre-seeded with all 114 Surahs including Arabic name, English name, juz,
and ayah count. This data is static and never changes.

---

### 6.11 Fee Management

**Routes:** `/admin/fees`
**Access:** admin, super_admin

#### Fee Structures

- Create fee structure: name, amount, frequency (monthly/termly/yearly/one_time), description,
  academic year (defaults to current), is_active toggle
- List fee structures: Name · Amount · Frequency · Status · Actions
- Edit, delete (only if no payments recorded against it)

#### Assigning Fees

Two assignment types:
1. **Class-level:** applies to all students in a class (FeeAssignment with classId set)
2. **Student-level:** applies to one specific student (FeeAssignment with studentId set)

Assignment form: select fee structure → select class OR specific student

#### Student Fee Ledger

For a given student, shows per-fee-structure:
- Fee name + frequency
- Gross amount
- Discount (if any): fixed (₦500 off) or percent (10% off)
- Net amount due
- Total paid
- Outstanding balance
- Payment history (date, amount, method, reference)

#### Record Payment

- Select student → select fee structure → enter: amount paid, date, payment method
  (cash/bank_transfer/online/other), reference number, period (e.g. "January 2025"), notes
- Creates FeePayment record + AuditLog entry

#### Discounts

- Add discount per student per fee structure
- Type: fixed (flat amount off) or percent (percentage off)
- Reason field
- One discount per [student, fee structure] — edit existing to update

---

### 6.12 Promotions & Year-End Processing

**Routes:** `/admin/promotions`
**Access:** admin, super_admin

#### What it does

At end of academic year, admin processes each class as a group. For each student in the class,
they set an outcome:

| Outcome | Meaning | Effect |
|---|---|---|
| `promoted` | Moves to next class in next year | student.status = promoted |
| `retained` | Stays in same class next year | student.status = active |
| `graduated` | Completed Hifz — leaves school | student.status = graduated |
| `withdrawn` | Left school by choice | student.status = withdrawn |
| `transferred` | Moved to another school | student.status = transferred |

#### Process

1. Admin selects a class to process
2. System shows roster of all active students in that class
3. For each student: select outcome + optional notes + destination class (if promoted)
4. Admin selects the target academic year
5. Submit → system:
   - Creates one `Promotion` record per student
   - Updates `student.status` accordingly
   - If promoted: updates `student.currentClassId` to destination class in new year
   - Wraps everything in a DB transaction
6. Idempotent: if promotion already exists for [studentId, fromAcademicYearId], update it

#### Promotion History View

- List all promotions grouped by academic year
- Filter by outcome
- Per-promotion: student name, from class → to class, outcome badge, processed by, date

---

### 6.13 Alumni Management

**Routes:** `/admin/alumni`
**Access:** admin, super_admin

- Lists all students with status IN (graduated, withdrawn, transferred)
- Not paginated differently — same table component as student list with status filter locked
- Shows: name, admission number, status badge, last class, graduation/exit date (from promotions)
- View alumni profile: read-only version of student detail with full history

---

### 6.14 Reports & Exports

**Routes:** `/admin/reports`
**Access:** admin, super_admin

#### PDF Reports (generated server-side with react-pdf)

| Report | Content |
|---|---|
| Student Progress Report | Individual student's memorization history, attendance summary, fee balance |
| Class Attendance Summary | All students in a class, attendance counts for a date range |
| Fee Receipt | Single payment receipt (student, amount, method, reference, date) |

#### Excel Exports (xlsx library)

| Export | Content |
|---|---|
| Student Roster | All active students with class, status, guardian contacts |
| Fee Collection Summary | All payments for a period: student, fee, amount, method, date |
| Hifz Progress Export | All memorization logs for a class/date range: student, type, surah range, pages, quality |

Reports page shows a form for each report type with relevant filters. Generate button
triggers a download.

---

### 6.15 Audit Logging

**Routes:** `/super-admin/audit-logs`
**Access:** super_admin only

- Append-only log of all significant system actions
- Fields per entry: timestamp, user (who did it), action string, entity type + ID,
  description, old values (JSON), new values (JSON), IP address
- Filterable by: action, user, date range, entity type
- Read-only table — no delete/edit

#### Actions to log

```
student.created / student.updated / student.deleted
fee.structure.created / fee.payment.recorded / fee.payment.deleted / fee.discount.applied
class.created / class.updated / class.deleted
user.created / user.updated / user.deactivated
promotion.processed
leave.approved / leave.rejected
academic_year.set_current
setting.updated
```

#### Helper function

```ts
// lib/audit.ts
export async function logAudit(params: {
  userId: string
  action: string
  auditableType?: string
  auditableId?: string
  description?: string
  oldValues?: object
  newValues?: object
  ipAddress?: string
}) { /* insert AuditLog record */ }
```

---

### 6.16 App Settings

**Routes:** `/super-admin/settings`
**Access:** super_admin only

Dynamic key-value settings grouped into tabs:

| Group | Settings |
|---|---|
| **General** | App name, timezone |
| **School** | School address, phone, email |
| **Finance** | Currency symbol, Paystack public key, Flutterwave public key |
| **SMS** | SMS provider, API key (for future SMS notifications) |

Settings are stored in DB as key-value pairs with type metadata (text/number/boolean/select).
The UI renders appropriate input types based on `type` field.
Cache setting values in memory (or use Supabase edge config) to avoid DB hit on every request.

---

### 6.17 User Management

**Routes:** `/super-admin/users`
**Access:** super_admin only

- List all users: Name · Email · Role badge · Status (active/inactive) · Actions
- **Create user:** name, email, password, role (admin/teacher)
- **Edit user:** name, email, role — password change is separate action
- **Toggle active/inactive:** deactivated users are logged out immediately on next request
- Delete: soft-discouraged — prefer deactivating. Only allow delete if user has no audit logs.
- No self-delete (super_admin cannot delete their own account)

---

### 6.18 Events Management

**Routes:** `/super-admin/events`
**Access:** super_admin only

- List events table: Title · Date · Published? · Actions
- **Create:** title, description, YouTube URL, event date, is_published toggle
- **Edit:** same fields
- **Delete:** removes from public display
- YouTube URL is stored raw; embed URL is derived on read (see 6.2 for conversion logic)
- Published events appear on landing page (latest 3) and `/events` page

---

### 6.19 Notifications

**In-app only (no email/SMS in initial build)**

- Stored in `notifications` table linked to a user
- Bell icon in top nav with unread count badge
- Dropdown shows last 10 notifications with read/unread styling
- "Mark all read" button
- Two notification types:
  - `new_leave_request` → sent to all admins when teacher submits leave
  - `leave_request_decided` → sent to teacher when admin approves/rejects

---

## 7. Route Map

### Public

```
GET  /                        Landing page
GET  /events                  All published events
GET  /pay                     Parent payment portal (lookup form)
POST /pay/lookup              Search student by admission number
POST /pay/initiate            Create payment intent + redirect to provider
GET  /pay/callback            Return from payment provider
POST /api/webhooks/paystack   Paystack webhook
POST /api/webhooks/flutterwave Flutterwave webhook
```

### Auth

```
GET  /login                   Login page
POST /login                   Authenticate
POST /logout                  Sign out
GET  /forgot-password         Password reset request
POST /forgot-password         Send reset email
GET  /reset-password/[token]  Reset password form
POST /reset-password          Submit new password
```

### Super Admin (`/super-admin/*`)

```
GET  /super-admin                     Dashboard
GET  /super-admin/users               User list
GET  /super-admin/users/new           Create user form
POST /super-admin/users               Create user
GET  /super-admin/users/[id]/edit     Edit user form
PUT  /super-admin/users/[id]          Update user
POST /super-admin/users/[id]/toggle   Activate/deactivate
GET  /super-admin/academic-years      Year list
POST /super-admin/academic-years      Create year
POST /super-admin/academic-years/[id]/set-current  Set as current
DELETE /super-admin/academic-years/[id]            Delete year
GET  /super-admin/events              Event list
GET  /super-admin/events/new          Create event form
POST /super-admin/events              Create event
GET  /super-admin/events/[id]/edit    Edit event form
PUT  /super-admin/events/[id]         Update event
DELETE /super-admin/events/[id]       Delete event
GET  /super-admin/settings            Settings page
POST /super-admin/settings            Save settings
GET  /super-admin/audit-logs          Audit log table
```

### Admin (`/admin/*`, also accessible by super_admin)

```
GET  /admin                           Dashboard
GET  /admin/students                  Student list
GET  /admin/students/new              Enroll student
POST /admin/students                  Create student
GET  /admin/students/[id]             Student detail
GET  /admin/students/[id]/edit        Edit student
PUT  /admin/students/[id]             Update student
DELETE /admin/students/[id]           Soft delete
GET  /admin/classes                   Class list
GET  /admin/classes/new               Create class
POST /admin/classes                   Create class
GET  /admin/classes/[id]              Class detail/roster
GET  /admin/classes/[id]/edit         Edit class
PUT  /admin/classes/[id]              Update class
DELETE /admin/classes/[id]            Delete class
GET  /admin/attendance/students       Attendance list/overview
GET  /admin/attendance/students/[classId]  Class attendance view
GET  /admin/attendance/teachers       Teacher attendance
POST /admin/attendance/teachers       Record teacher attendance
GET  /admin/leave-requests            Leave request list
POST /admin/leave-requests/[id]/approve  Approve leave
POST /admin/leave-requests/[id]/reject   Reject leave
GET  /admin/fees/structures           Fee structure list
POST /admin/fees/structures           Create fee structure
GET  /admin/fees/structures/[id]/edit Edit fee structure
PUT  /admin/fees/structures/[id]      Update fee structure
DELETE /admin/fees/structures/[id]    Delete fee structure
POST /admin/fees/assign               Assign fee to class/student
GET  /admin/fees/ledger/[studentId]   Student fee ledger
POST /admin/fees/payments             Record payment
DELETE /admin/fees/payments/[id]      Delete payment
POST /admin/fees/discounts            Apply discount
DELETE /admin/fees/discounts/[id]     Remove discount
GET  /admin/memorization              Memorization overview
GET  /admin/memorization/[studentId]  Student memorization history
GET  /admin/promotions                Promotions list
GET  /admin/promotions/[classId]      Process class promotions
POST /admin/promotions                Submit promotion decisions
GET  /admin/alumni                    Alumni list
GET  /admin/alumni/[id]               Alumni profile
GET  /admin/reports                   Reports index
GET  /admin/reports/student-progress  PDF download
GET  /admin/reports/class-attendance  PDF download
GET  /admin/reports/fee-receipt/[id]  PDF download
GET  /admin/reports/export/students   Excel download
GET  /admin/reports/export/fees       Excel download
GET  /admin/reports/export/hifz       Excel download
```

### Teacher (`/teacher/*`)

```
GET  /teacher                         Dashboard
GET  /teacher/attendance              Take attendance (class+date picker)
POST /teacher/attendance              Submit attendance records
GET  /teacher/attendance/history      Past submissions
GET  /teacher/memorization            Student list for logging
GET  /teacher/memorization/new        Log new session
POST /teacher/memorization            Save session
GET  /teacher/memorization/[id]       View session detail
GET  /teacher/memorization/[id]/edit  Edit session
PUT  /teacher/memorization/[id]       Update session
DELETE /teacher/memorization/[id]     Delete session
GET  /teacher/leave                   My leave requests
POST /teacher/leave                   Submit leave request
DELETE /teacher/leave/[id]            Cancel pending request
```

---

## 8. Implementation Plan

### Stack Decision Summary

- **Next.js 14** with App Router + Server Components + Server Actions
- **Prisma** as ORM against **Supabase PostgreSQL**
- **NextAuth.js v5** for authentication with credentials provider
- **Tailwind CSS** with the coffee palette defined above
- **Zod** for all input validation
- **react-pdf** for PDF generation
- **xlsx** for Excel exports
- Hosted on **Vercel** (free tier), DB on **Supabase** (free tier)

---

### Phase 0 — Project Bootstrap (Day 1)

- [ ] `npx create-next-app@latest hadda-school --typescript --tailwind --app`
- [ ] Install: `prisma`, `@prisma/client`, `next-auth`, `zod`, `react-hook-form`,
      `@hookform/resolvers`, `date-fns`, `xlsx`, `@react-pdf/renderer`
- [ ] Configure `tailwind.config.ts` — add the `coffee` palette + Figtree font
- [ ] Add Figtree to `app/layout.tsx` via Google Fonts (`next/font/google`)
- [ ] Set up Prisma: `npx prisma init` → write full schema → `npx prisma db push`
- [ ] Write `prisma/seed.ts` — seed all 114 Surahs
- [ ] Run seed: `npx prisma db seed`
- [ ] Create `lib/db.ts` (Prisma singleton for dev)
- [ ] Scaffold route group folders: `(public)`, `(auth)`, `(admin)`, `(teacher)`, `(super-admin)`
- [ ] Create `lib/auth.ts` with NextAuth credentials provider
- [ ] Write `middleware.ts` for route-level role guards
- [ ] Create `components/ui/` primitives: Button, Badge, Card, Input, Select, Textarea, Modal

**Done when:** `npx prisma studio` shows all tables, `/` loads without error, auth flow works.

---

### Phase 1 — Public Site (Days 2–3)

- [ ] Landing page (`app/(public)/page.tsx`) — all 8 sections, hardcoded stats
- [ ] Events listing page (`app/(public)/events/page.tsx`) — paginated grid
- [ ] YouTube URL → embed URL utility function
- [ ] Shared nav + footer components for public pages
- [ ] **Vercel deploy** — confirm public pages work in production

**Done when:** Landing page and events page render correctly on Vercel.

---

### Phase 2 — Auth & Shells (Days 4–5)

- [ ] Login page with credentials form (`app/(auth)/login/page.tsx`)
- [ ] Forgot password + reset password pages
- [ ] Admin layout shell: sidebar + topnav + notification bell
- [ ] Teacher layout shell: sidebar + topnav
- [ ] Super Admin layout shell: sidebar + topnav
- [ ] Sidebar nav links per role (see sidebar items below)
- [ ] Dashboard placeholder pages for each role (just shell + "coming soon")
- [ ] Role-based redirect after login (super_admin → `/super-admin`, admin → `/admin`,
      teacher → `/teacher`)
- [ ] "Your account has been deactivated" page for inactive users

**Sidebar items — Admin:**
Students · Classes · Attendance (Students / Teachers) · Leave Requests · Fees · Memorization ·
Promotions · Alumni · Reports

**Sidebar items — Teacher:**
Dashboard · Take Attendance · Attendance History · Memorization Logs · Leave Requests

**Sidebar items — Super Admin:**
Dashboard · Users · Academic Years · Events · Settings · Audit Logs · (all Admin items)

**Done when:** All three portals load with correct sidebar, auth redirects work, inactive user
is blocked.

---

### Phase 3 — Core Admin CRUD (Days 6–10)

Build these in order (each depends on the previous):

#### 3a. Academic Years
- [ ] List, create, set-current, delete
- [ ] `getCurrentAcademicYear()` utility used across the app

#### 3b. User Management
- [ ] List, create, edit, toggle active, role assignment

#### 3c. Class Management
- [ ] List, create, edit (with teacher assignment multi-select), delete
- [ ] Class detail/roster view

#### 3d. Student Enrollment
- [ ] Student list with live search (debounced, filters by name/admission/status/class)
- [ ] Create form with guardian sub-forms (dynamic add/remove)
- [ ] Auto-generate admission number on form submission
- [ ] Photo upload → Supabase Storage
- [ ] Student detail page
- [ ] Edit student
- [ ] Soft delete

**Done when:** Full CRUD for all four entities works end-to-end with validation errors shown.

---

### Phase 4 — Attendance & Leave (Days 11–13)

#### 4a. Student Attendance
- [ ] Teacher: attendance taking form (roster with status selects, bulk submit)
- [ ] Admin: attendance overview table with class+date filters
- [ ] Attendance history (teacher view)

#### 4b. Teacher Attendance
- [ ] Admin: daily teacher attendance form

#### 4c. Leave Requests
- [ ] Teacher: submit form + own request list
- [ ] Admin: pending list + approve/reject modal

**Done when:** Teacher can take attendance, admin can see it and manage leave.

---

### Phase 5 — Memorization System (Days 14–16)

- [ ] Teacher: log session form (surah selectors, quality, type, pages)
- [ ] Surah selector component (searchable dropdown, shows Arabic + English)
- [ ] Teacher: student memorization list (view all their students' logs)
- [ ] Admin: read-only memorization overview
- [ ] Student detail page: memorization log tab with progress summary
- [ ] `getStudentProgress()` service: total pages by type

**Done when:** Teacher can log sabaq/sabqi/manzil sessions, admin can view per-student history.

---

### Phase 6 — Fee System (Days 17–21)

This is the most complex phase. Take time to test each piece.

- [ ] Fee structure CRUD (name, amount, frequency, academic year)
- [ ] Fee assignment (class-level and student-level)
- [ ] `FeeService.ts`: studentAssignedFees(), studentLedger(), studentBalance()
- [ ] Student fee ledger view
- [ ] Record payment form
- [ ] Delete payment
- [ ] Apply/remove discount
- [ ] Parent payment portal (`/pay`) — student lookup
- [ ] Payment initiation — create PaymentIntent + redirect to Paystack
- [ ] `/pay/callback` — verify payment + create FeePayment
- [ ] Paystack webhook handler
- [ ] Flutterwave integration (same pattern as Paystack)
- [ ] Payment receipt display

**Done when:** Admin can manage fees and record payments; parent can pay via Paystack and
the payment is reflected in the ledger.

---

### Phase 7 — Promotions & Alumni (Days 22–24)

- [ ] Promotion processing form (class roster with outcome selects)
- [ ] `PromotionService.ts`: processClass() — transactional bulk processing
- [ ] Promotion history view
- [ ] Admin dashboard stats: active students, present today, fees this month, teachers absent
- [ ] Teacher dashboard stats: students in class, attendance today, outstanding fees
- [ ] Alumni list + alumni detail (read-only)

**Done when:** End-of-year promotions work correctly with DB transaction safety.

---

### Phase 8 — Reports & Exports (Days 25–27)

- [ ] Student Progress PDF (react-pdf component)
- [ ] Class Attendance Summary PDF
- [ ] Fee Receipt PDF
- [ ] Student Roster Excel export (xlsx)
- [ ] Fee Collection Excel export
- [ ] Hifz Progress Excel export
- [ ] Reports index page with filter forms + download buttons

**Done when:** All 6 report types download correctly as PDF/Excel files.

---

### Phase 9 — System Features (Days 28–29)

- [ ] Audit logging: add `logAudit()` calls to all significant mutations
- [ ] Audit log viewer (super_admin)
- [ ] Notification system: bell icon, dropdown, mark-read, mark-all-read
- [ ] Settings page (super_admin) with grouped tabs
- [ ] Settings cache layer

**Done when:** Audit log captures all admin actions, notifications work for leave flow.

---

### Phase 10 — Events Management & Polish (Day 30)

- [ ] Super admin events CRUD
- [ ] Events appearing on landing page (3 most recent published)
- [ ] Events full page with pagination
- [ ] Admin dashboard widgets (complete the stat queries)
- [ ] Teacher dashboard stats
- [ ] Fix any outstanding bugs from previous phases
- [ ] Mobile responsiveness pass on all pages
- [ ] Error boundary pages (404, 500)
- [ ] Loading states / skeletons on data-heavy pages

---

### Phase 11 — Production Readiness

- [ ] Environment variables documented (`.env.example`)
- [ ] Supabase Row Level Security reviewed (all queries go through Prisma/server, so RLS is
      a secondary layer — but set it up for defence in depth)
- [ ] Rate limiting on webhook endpoints (Vercel Edge Config or middleware)
- [ ] Image optimization: use `next/image` for student photos
- [ ] Confirm Vercel free tier limits are sufficient (100GB bandwidth, 10s function timeout)
  - PDF generation may need Vercel Pro if it exceeds 10s — test this
- [ ] Final Vercel deploy + smoke test all user roles

---

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-app.vercel.app"

# Supabase Storage (for student photos)
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Paystack
PAYSTACK_SECRET_KEY="..."
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="..."
PAYSTACK_WEBHOOK_SECRET="..."

# Flutterwave
FLUTTERWAVE_SECRET_KEY="..."
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY="..."
FLUTTERWAVE_WEBHOOK_SECRET="..."
```

---

### Estimated Timeline

| Phase | Work | Days |
|---|---|---|
| 0 | Bootstrap | 1 |
| 1 | Public site | 2 |
| 2 | Auth + shells | 2 |
| 3 | Core CRUD | 5 |
| 4 | Attendance + Leave | 3 |
| 5 | Memorization | 3 |
| 6 | Fee system + payment | 5 |
| 7 | Promotions + alumni | 3 |
| 8 | Reports + exports | 3 |
| 9 | System features | 2 |
| 10 | Events + polish | 1 |
| 11 | Production readiness | 1 |
| **Total** | | **~31 days** |

> Working full-time on this, a developer who knows TypeScript/React/Next.js well can complete
> the rebuild in 4–6 weeks. Phases 1–4 give you a usable system; Phases 5–8 complete the
> full feature set.
