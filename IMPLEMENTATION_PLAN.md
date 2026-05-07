# Implementation Plan
## Abdullah ibn Mas'ud School Management System

**Stack:** Laravel 11, MySQL, Livewire 3, Tailwind CSS 3, Alpine.js

---

## How to Read This Plan

Each phase builds on the previous. Phases 1–3 are the foundation — nothing else works without them. Phases 4–7 are the core school operations. Phases 8–10 are the reporting, payment, and automation layer. Phase 11 is hardening and deployment.

Estimated implementation order is sequential, but Phases 4, 5, and 6 can be parallelized by separate developers once Phase 3 is complete.

---

## Phase 1: Project Setup & Infrastructure

### Goals
Bootstrap the full Laravel project with all core dependencies and tooling wired up before writing any feature code.

### Steps

**1.1 — Laravel Installation**
```bash
composer create-project laravel/laravel hadda-school
cd hadda-school
```

**1.2 — Frontend Tooling**
```bash
npm install
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
npx tailwindcss init -p
```
Configure `tailwind.config.js` content paths to include `resources/views/**/*.blade.php`.

**1.3 — Core Composer Packages**
```bash
composer require livewire/livewire
composer require barryvdh/laravel-dompdf          # PDF generation
composer require maatwebsite/excel                 # Excel/CSV export
composer require spatie/laravel-permission         # Role & Permission management
composer require unicodeveloper/laravel-paystack   # Paystack SDK
composer require kingflamez/laravelrave           # Flutterwave SDK
composer require laravel/breeze --dev              # Auth scaffolding (Blade stack)
php artisan breeze:install blade
```

**1.4 — Database Configuration**
- Create MySQL database `hadda_school`
- Configure `.env`: `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- Set `APP_NAME`, `APP_URL`, `APP_TIMEZONE`

**1.5 — Environment Variables to Add**
```env
# Paystack
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_PAYMENT_URL=https://api.paystack.co

# Flutterwave
FLW_PUBLIC_KEY=
FLW_SECRET_KEY=
FLW_SECRET_HASH=

# SMS (e.g., Termii or Africa's Talking)
SMS_PROVIDER=termii
SMS_API_KEY=
SMS_SENDER_ID=
```

**1.6 — Directory Structure Conventions**
```
app/
  Models/
  Http/
    Controllers/
      Admin/
      Teacher/
      SuperAdmin/
      Public/         ← parent payment portal (no auth)
    Livewire/
      Admin/
      Teacher/
  Services/
    PaymentService.php
    AttendanceService.php
    FeeService.php
    NotificationService.php
  Jobs/
  Policies/
resources/
  views/
    layouts/
      admin.blade.php
      teacher.blade.php
      public.blade.php     ← payment portal layout
    admin/
    teacher/
    super-admin/
    public/
```

**1.7 — Tailwind & Alpine.js Wiring**
```bash
npm run build
```
Verify Tailwind classes compile. Add Alpine.js via CDN in base layout or via npm.

**1.8 — Run Initial Migration**
```bash
php artisan migrate
```

### Deliverable
A clean, booted Laravel app with all packages installed, database connected, auth scaffolded, and folder structure in place.

---

## Phase 2: User Roles, Auth & Permissions

### Goals
Implement the three-tier role system. Every subsequent feature depends on knowing who is logged in and what they can do.

### Database Migrations

**`users` table additions:**
```php
$table->enum('role', ['super_admin', 'admin', 'teacher'])->default('teacher');
$table->boolean('is_active')->default(true);
$table->string('phone')->nullable();
$table->string('avatar')->nullable();
```

### Models & Relationships
- `User` — has role, `hasMany(ClassRoom)` for teachers
- Publish and configure Spatie Permission — but since roles are simple and fixed, use a direct `role` column on `users` rather than Spatie's full dynamic permission system (saves complexity). Use Laravel Policies for authorization.

### Policies
Create one policy per major resource, with methods that check `$user->role`:

| Policy | Governs |
|---|---|
| `StudentPolicy` | view, create, update, promote, archive |
| `ClassPolicy` | create, assign teachers |
| `AttendancePolicy` | record, edit by class/global |
| `FeePolicy` | record, view, manage structure |
| `TeacherAttendancePolicy` | record (admin+) |
| `ReportPolicy` | view reports |
| `UserPolicy` | create/edit users (super_admin only) |

### Middleware
Create `CheckRole` middleware:
```php
// app/Http/Middleware/CheckRole.php
if (!in_array(auth()->user()->role, $roles)) {
    abort(403);
}
```
Register in `bootstrap/app.php` and apply to route groups.

### Route Groups
```php
// routes/web.php
Route::middleware(['auth', 'role:teacher,admin,super_admin'])->prefix('teacher')->group(...)
Route::middleware(['auth', 'role:admin,super_admin'])->prefix('admin')->group(...)
Route::middleware(['auth', 'role:super_admin'])->prefix('super-admin')->group(...)
Route::prefix('pay')->group(...) // ← no auth, public
```

### Layouts
Three Blade layouts — `admin.blade.php`, `teacher.blade.php`, and `super-admin.blade.php` — each with a sidebar showing only the navigation items appropriate for that role. Shared `public.blade.php` for the payment portal.

### Password Reset
Use Laravel's built-in reset (already included in Breeze). Customize email template with school branding.

### Deliverable
- Login page working
- Three role-based dashboards accessible
- Attempting to access a forbidden route returns 403
- User management CRUD (SuperAdmin only)

---

## Phase 3: Student & Class Management

### Goals
The master data layer — students and classes must exist before attendance, fees, or memorization can be recorded.

### Database Migrations

**`academic_years`**
```php
$table->id();
$table->string('name');           // e.g., "2024-2025"
$table->date('start_date');
$table->date('end_date');
$table->boolean('is_current')->default(false);
$table->timestamps();
```

**`classes`**
```php
$table->id();
$table->string('name');           // e.g., "Hifz Circle A", "Level 2"
$table->integer('capacity')->nullable();
$table->integer('order')->default(0);  // for promotion ordering
$table->foreignId('academic_year_id')->constrained();
$table->timestamps();
```

**`class_teacher`** (pivot)
```php
$table->foreignId('class_id')->constrained()->cascadeOnDelete();
$table->foreignId('user_id')->constrained()->cascadeOnDelete(); // teacher
$table->boolean('is_primary')->default(false);
```

**`students`**
```php
$table->id();
$table->string('admission_number')->unique();
$table->string('first_name');
$table->string('last_name');
$table->date('date_of_birth')->nullable();
$table->date('enrollment_date');
$table->string('photo')->nullable();
$table->string('address')->nullable();
$table->enum('status', ['active', 'promoted', 'graduated', 'withdrawn', 'transferred'])->default('active');
$table->foreignId('current_class_id')->nullable()->constrained('classes');
$table->foreignId('academic_year_id')->constrained();
$table->timestamps();
$table->softDeletes();
```

**`guardians`**
```php
$table->id();
$table->foreignId('student_id')->constrained()->cascadeOnDelete();
$table->string('name');
$table->string('phone');           // used for payment portal lookup
$table->string('email')->nullable();
$table->string('relationship');    // Father, Mother, Guardian
$table->boolean('is_primary')->default(false);
$table->timestamps();
```

### Models
- `Student` — `belongsTo(ClassRoom)`, `hasMany(Guardian)`, `hasMany(Attendance)`, `hasMany(FeePayment)`, `hasMany(MemorizationLog)`, `hasMany(Promotion)`
- `ClassRoom` — `belongsToMany(User, 'class_teacher')`, `hasMany(Student)`, `belongsTo(AcademicYear)`
- `Guardian` — `belongsTo(Student)`
- `AcademicYear` — `hasMany(ClassRoom)`, scope `current()`

### Features to Build

**Student Enrollment Form** (Admin+)
- Auto-generate admission number (e.g., `HMS-2025-0001`)
- Select class from current academic year
- Add 1–2 guardian records with phone numbers
- Upload photo (stored in `storage/app/public/students`)

**Student Profile Page**
- View all student details
- Guardian contact info
- Tabs: Attendance Summary | Fee Summary | Memorization Progress
- Quick-action buttons: Edit | Promote | Archive

**Class Management** (Admin+)
- Create/edit classes
- Assign teachers (primary + additional)
- View class roster as a paginated table
- Class statistics: total students, attendance rate this month, total fees collected

**Student Search**
- Global search by name or admission number (Admin+)
- Teacher search scoped to their own class

### Livewire Components
- `StudentTable` — paginated, filterable, sortable
- `ClassRoster` — class-specific student list with quick stats
- `StudentEnrollmentForm` — multi-step form with guardian section

### Deliverable
- Students can be enrolled, edited, and viewed
- Classes exist and teachers are assigned
- Guardians are recorded with phone numbers
- Academic year is configured

---

## Phase 4: Attendance Modules

### Goals
Daily attendance recording for students (by teachers) and for teachers (by admin).

### Database Migrations

**`student_attendances`**
```php
$table->id();
$table->foreignId('student_id')->constrained()->cascadeOnDelete();
$table->foreignId('class_id')->constrained();
$table->foreignId('recorded_by')->constrained('users');
$table->date('date');
$table->enum('status', ['present', 'absent', 'late', 'excused']);
$table->string('note')->nullable();
$table->timestamps();
$table->unique(['student_id', 'date']); // one record per student per day
```

**`teacher_attendances`**
```php
$table->id();
$table->foreignId('user_id')->constrained()->cascadeOnDelete(); // teacher
$table->foreignId('recorded_by')->constrained('users');         // admin
$table->date('date');
$table->enum('status', ['present', 'absent', 'late', 'on_leave']);
$table->string('note')->nullable();       // substitution note
$table->timestamps();
$table->unique(['user_id', 'date']);
```

**`leave_requests`**
```php
$table->id();
$table->foreignId('user_id')->constrained(); // teacher requesting
$table->date('start_date');
$table->date('end_date');
$table->string('reason');
$table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
$table->foreignId('reviewed_by')->nullable()->constrained('users');
$table->timestamp('reviewed_at')->nullable();
$table->timestamps();
```

### Student Attendance — Teacher View

**Bulk Attendance Grid** (Livewire)
- Loads all students in teacher's class for today
- Each row: student name | radio buttons (Present / Absent / Late / Excused) | note field
- "Mark All Present" button at top
- Submit records all at once in a single transaction
- If attendance already recorded today, load existing and allow edits
- Disable submit if date is more than 2 days in the past (configurable)

**Attendance History View**
- Calendar view showing monthly attendance per student
- Color coded: green (present), red (absent), yellow (late), blue (excused)
- Per-student attendance percentage for current month

**Absence Alert Logic**
- After each submission, check if any student has ≥ N consecutive absences (N configurable in settings)
- If threshold crossed, fire `StudentAbsenceAlert` notification → Admin notified in-app; parent SMS optional

### Teacher Attendance — Admin View

**Daily Teacher Marking**
- Table of all teachers for today
- Same status options: Present / Absent / Late / On Leave
- Note field for substitution details
- Auto-fills "On Leave" for teachers with approved leave requests

**Leave Request Workflow**
- Teacher submits leave request with date range and reason
- Admin sees pending requests in notification badge
- Approve/Reject with optional comment
- Approved leaves auto-mark teacher attendance

**Monthly Summary Table**
- Per-teacher: total days present, absent, late, on leave, attendance %

### Deliverable
- Teachers can take daily bulk attendance for their class
- Admin can mark teacher attendance
- Leave request → approval workflow functions
- Absence alerts trigger after threshold

---

## Phase 5: Fee Management (Internal)

### Goals
Full fee lifecycle — structure definition, per-student assignment, payment recording, receipts — without any payment gateway yet.

### Database Migrations

**`fee_types`**
```php
$table->id();
$table->string('name');              // Tuition, Registration, Uniform, etc.
$table->string('description')->nullable();
$table->timestamps();
```

**`fee_structures`**
```php
$table->id();
$table->foreignId('fee_type_id')->constrained();
$table->foreignId('class_id')->nullable()->constrained();  // null = applies to all classes
$table->foreignId('academic_year_id')->constrained();
$table->decimal('amount', 10, 2);
$table->enum('frequency', ['one_time', 'monthly', 'termly', 'annual']);
$table->timestamps();
```

**`student_fees`** (individual student fee obligation)
```php
$table->id();
$table->foreignId('student_id')->constrained();
$table->foreignId('fee_structure_id')->constrained();
$table->decimal('amount_due', 10, 2);
$table->decimal('amount_paid', 10, 2)->default(0);
$table->enum('status', ['unpaid', 'partial', 'paid'])->default('unpaid');
$table->date('due_date')->nullable();
$table->timestamps();
```

**`fee_payments`**
```php
$table->id();
$table->foreignId('student_fee_id')->constrained();
$table->foreignId('student_id')->constrained();
$table->decimal('amount', 10, 2);
$table->date('payment_date');
$table->enum('method', ['cash', 'bank_transfer', 'paystack', 'flutterwave']);
$table->string('receipt_number')->unique();
$table->string('transaction_reference')->nullable(); // gateway ref
$table->foreignId('recorded_by')->nullable()->constrained('users'); // null = online payment
$table->foreignId('payment_transaction_id')->nullable()->constrained(); // for online bulk payments
$table->timestamps();
```

**`payment_transactions`** (parent portal bulk payments)
```php
$table->id();
$table->string('guardian_phone');
$table->string('gateway');               // paystack | flutterwave
$table->string('gateway_reference')->unique();
$table->decimal('total_amount', 10, 2);
$table->enum('status', ['pending', 'success', 'failed'])->default('pending');
$table->json('meta')->nullable();        // raw gateway response
$table->timestamps();
```

### Models
- `FeeStructure` — `belongsTo(FeeType)`, `belongsTo(ClassRoom)`, `belongsTo(AcademicYear)`
- `StudentFee` — `belongsTo(Student)`, `hasMany(FeePayment)`; computed `balance` attribute
- `FeePayment` — `belongsTo(StudentFee)`, `belongsTo(PaymentTransaction)`
- `PaymentTransaction` — `hasMany(FeePayment)`

### Features

**Fee Structure Setup** (Admin+)
- Create fee types and attach amounts per class per academic year
- Bulk-assign fee obligations to all students in a class when structure is created

**Payment Recording** (Teacher — own class only; Admin — all classes)
- Select student → shows outstanding fee items
- Enter amount (partial payment allowed), date, method
- Auto-generate receipt number: `RCP-2025-00001`
- Update `StudentFee.amount_paid` and recalculate status

**Receipt View / Print**
- Printable receipt page (DomPDF)
- School header, student name, class, list of fees paid, total, date, recorded by

**Outstanding Balance Dashboard**
- List of students with unpaid/partial fees
- Filter by class, fee type, due date
- Export to Excel for follow-up

### Deliverable
- Admin/teacher can record cash/bank payments
- Receipts generate correctly
- Outstanding balances are visible per student and per class

---

## Phase 6: Memorization Progress Tracking

### Goals
The defining module of a hifz school — logging daily sessions, tracking cumulative Quran progress, and managing revision schedules.

### Quran Structure Reference Data

Seed a `surahs` reference table:
```php
// 114 surahs with: id, name_arabic, name_english, juz_number, total_ayahs
```

### Database Migrations

**`memorization_logs`**
```php
$table->id();
$table->foreignId('student_id')->constrained();
$table->foreignId('class_id')->constrained();
$table->foreignId('recorded_by')->constrained('users'); // teacher
$table->date('session_date');
$table->enum('session_type', ['new', 'revision']);
$table->foreignId('surah_id')->constrained();
$table->integer('from_ayah');
$table->integer('to_ayah');
$table->integer('lines_count')->nullable();  // calculated or manual
$table->enum('quality', ['strong', 'average', 'weak']);
$table->text('notes')->nullable();
$table->timestamps();
```

**`student_memorization_progress`** (aggregate/milestone table)
```php
$table->id();
$table->foreignId('student_id')->constrained()->unique();
$table->integer('total_juz_completed')->default(0);
$table->integer('total_ayahs_memorized')->default(0);
$table->foreignId('current_surah_id')->nullable()->constrained('surahs');
$table->integer('current_ayah')->default(1);
$table->date('last_session_date')->nullable();
$table->timestamps();
```

**`revision_schedule`**
```php
$table->id();
$table->foreignId('student_id')->constrained();
$table->foreignId('surah_id')->constrained();
$table->integer('from_ayah');
$table->integer('to_ayah');
$table->date('scheduled_date');
$table->boolean('completed')->default(false);
$table->date('completed_date')->nullable();
$table->timestamps();
```

### Features

**Daily Session Log Form** (Livewire — Teacher view)
- Select student from class
- Session type: New Memorization or Revision
- Select Surah → from Ayah → to Ayah (dynamic dropdowns, auto-calculated ayah count)
- Quality rating with visual selector (Strong / Average / Weak)
- Notes textarea
- Submit → updates `student_memorization_progress` aggregate

**Student Progress Card**
- Visual Quran progress bar (X of 604 pages / X of 30 juz)
- Current position (e.g., "Surah Al-Baqarah, Ayah 143")
- Recent 7 sessions table
- Juz completion badges

**Revision Schedule**
- Auto-suggest revision items: any portion not revised in the last 7 days
- Teacher can mark revision sessions as completed
- Overdue revision alerts (red highlight)

**Class Memorization Summary** (Admin view)
- Table: all students in class, current juz, total ayahs memorized, last session date, quality trend
- Sortable by progress

### Deliverable
- Teachers log new memorization and revision daily
- Student progress card updates in real time
- Revision overdue alerts appear

---

## Phase 7: Promotions & Alumni Records

### Goals
Move students between classes cleanly and archive leavers without losing any history.

### Database Migrations

**`promotions`**
```php
$table->id();
$table->foreignId('student_id')->constrained();
$table->foreignId('from_class_id')->constrained('classes');
$table->foreignId('to_class_id')->constrained('classes');
$table->foreignId('from_academic_year_id')->constrained('academic_years');
$table->foreignId('to_academic_year_id')->constrained('academic_years');
$table->foreignId('processed_by')->constrained('users');
$table->enum('type', ['promotion', 'demotion', 'transfer']);
$table->string('reason')->nullable();
$table->date('effective_date');
$table->timestamps();
```

**`alumni`**
```php
$table->id();
$table->foreignId('student_id')->constrained(); // soft-link to original student record
$table->string('admission_number');
$table->string('full_name');
$table->date('enrollment_date');
$table->date('departure_date');
$table->enum('departure_reason', ['graduated', 'withdrawn', 'transferred_out', 'other']);
$table->string('final_class');
$table->integer('total_juz_completed')->default(0);
$table->text('notes')->nullable();
$table->timestamps();
```

### Promotion Flow

**Bulk Promotion Wizard** (Admin — 3 steps):
1. Select source class and destination class
2. Select which students to promote (default: all active students; checkboxes to exclude)
3. Confirm preview → execute

On execution:
- Update each student's `current_class_id` to new class
- Update `status` to `active`
- Create `Promotion` record for each student
- All historical records (attendance, fees, memorization) remain linked to the student — they are **not** duplicated or reset

**Demotion**
- Same form, but `type = 'demotion'` requires a mandatory reason field

**Archive as Alumni**
- Triggered when a student's status is set to `graduated`, `withdrawn`, or `transferred_out`
- Copies key fields to `alumni` table + snapshot of memorization progress
- Original `students` record is soft-deleted
- Alumni are searchable by name, admission number, departure year

**Re-Enrollment**
- Admin finds alumni record → clicks "Re-enroll"
- Restores the soft-deleted student record
- Assigns to selected class
- Adds a promotion record of type `transfer` for the re-enrollment event

### Deliverable
- Bulk promotion wizard functions
- Promotion history log is accurate
- Departing students archived to alumni
- Re-enrollment restores all history

---

## Phase 8: Reports, Analytics & Exports

### Goals
Give Admin and SuperAdmin meaningful visibility across all modules. All reports must be exportable.

### Report Types

**Attendance Reports**
- Daily class attendance sheet (table: student names vs. status)
- Monthly summary per student (% present, days absent, etc.)
- Monthly summary per class
- Teacher attendance monthly report

**Fee Reports**
- Collection summary: total collected by class, by fee type, by month
- Outstanding balances: students with unpaid fees, sorted by amount overdue
- Payment history for a specific student
- Gateway reconciliation: Paystack vs. Flutterwave vs. Cash totals

**Memorization Reports**
- Per-student progress over a date range
- Class ranking by total ayahs memorized
- Quality trend report (% strong/average/weak sessions per student)

**Promotion Reports**
- Academic year promotion summary: how many students per class promoted
- Individual student promotion history

**Alumni Reports**
- Total alumni count by year
- Average juz completed at departure

### Implementation

Each report = a dedicated `App\Reports\` class with:
- `query()` method (Eloquent)
- `toArray()` for blade view
- `toExcel()` using `Maatwebsite\Excel\Concerns\FromCollection`
- `toPdf()` using DomPDF

**Export Controller:**
```php
Route::get('/admin/reports/{type}/export/{format}', ReportExportController::class);
// format: pdf | excel | csv
```

### Dashboards

**Teacher Dashboard**
- Today's class attendance status (taken or not)
- Students absent today
- Upcoming revision schedule items

**Admin Dashboard**
- Total students (active)
- Attendance rate today across all classes
- Total fees collected this month
- Teachers absent today
- Recent payment activity

**SuperAdmin Dashboard**
- Everything Admin sees + system health stats
- User account counts
- Recent audit log entries

### Deliverable
- All 6 report types generate correctly
- PDF and Excel exports download without errors
- Dashboards show accurate live data

---

## Phase 9: Parent Payment Portal (Paystack & Flutterwave)

### Goals
A public-facing, no-login payment experience. Parents pay fees online for one or multiple children in a single transaction.

### Routes (no auth middleware)
```php
Route::prefix('pay')->name('pay.')->group(function () {
    Route::get('/', [PaymentPortalController::class, 'index'])->name('index');
    Route::post('/lookup', [PaymentPortalController::class, 'lookup'])->name('lookup');
    Route::post('/initiate', [PaymentPortalController::class, 'initiate'])->name('initiate');
    Route::get('/callback', [PaymentPortalController::class, 'callback'])->name('callback');
    Route::post('/webhooks/paystack', [PaystackWebhookController::class, 'handle']);
    Route::post('/webhooks/flutterwave', [FlutterwaveWebhookController::class, 'handle']);
});
```

### Page 1: Phone Lookup

```
Enter your phone number: [ 0801 234 5678 ]  [ Find My Children ]
```

- POST to `/pay/lookup`
- Query `guardians` table WHERE `phone = ?`
- Return all associated `students` (status = active) with their outstanding `student_fees`
- If no students found → show "No students found for this number" (do not reveal why)
- Rate-limit: 10 lookups per IP per 15 minutes (Laravel `throttle` middleware)

### Page 2: Fee Selection & Payment

```
Children on your account:

[ ✓ ] Abdullahi Musa — Class: Level 2
       • Tuition (March)     ₦15,000  ✓ Select
       • Uniform             ₦3,500   ✓ Select
       Subtotal: ₦18,500

[ ✓ ] Fatima Musa — Class: Hifz Circle A
       • Tuition (March)     ₦15,000  ✓ Select
       Subtotal: ₦15,000

Total: ₦33,500

Pay with:  [ Paystack ]  [ Flutterwave ]
```

- Full page is a Livewire component (`ParentPaymentPortal`)
- Selecting/deselecting fee items recalculates total live
- Students with zero balance show "Fully Paid" badge and are not selectable

### Payment Initiation

`PaymentService::initiate(array $selectedFeeIds, string $gateway, string $phone)`:

1. Create a `PaymentTransaction` record with `status = pending`, `gateway`, `guardian_phone`, `total_amount`
2. Store `selectedFeeIds` as JSON in `meta`
3. Call gateway API to initialize payment:
   - **Paystack:** `POST /transaction/initialize` with `amount` (kobo), `email` (use school email as fallback), `reference` = transaction UUID, `callback_url`
   - **Flutterwave:** `POST /payments` with `amount`, `currency=NGN`, `redirect_url`, `tx_ref` = transaction UUID
4. Redirect parent to gateway checkout URL

### Webhook Handlers

Both webhooks run via queued jobs to avoid timeout:

**`PaystackWebhookController`**:
```php
public function handle(Request $request) {
    // 1. Verify signature: hash_equals(hash_hmac('sha512', $request->getContent(), config('paystack.secretKey')), $request->header('x-paystack-signature'))
    // 2. Dispatch ProcessPaystackPayment::class job
    return response()->json(['status' => 'ok']);
}
```

**`ProcessPaystackPayment` Job**:
```php
// Only process if event == 'charge.success'
// Find PaymentTransaction by reference
// Verify amount matches
// Call PaymentAllocationService::allocate($transaction)
```

**`PaymentAllocationService::allocate`**:
```php
// For each student_fee_id in transaction meta:
//   - Create FeePayment record
//   - Update StudentFee amount_paid and status
// Mark PaymentTransaction as success
// Dispatch SendPaymentConfirmation notification (SMS + email)
```

### Combined Receipt

After successful webhook processing, parent can access:
`GET /pay/receipt/{transaction_reference}`

DomPDF receipt showing:
- School header
- Transaction reference and date
- For each child: name, class, fee items paid, subtotal
- Grand total
- Gateway used

### Security Checklist for This Module
- [ ] Webhook signature verified before any DB write
- [ ] `PaymentTransaction` amount validated against gateway response amount before allocating
- [ ] Phone lookup rate-limited (10 req / 15 min / IP)
- [ ] CSRF token on initiation form (Livewire handles this automatically)
- [ ] No student data shown beyond name, class, and balance
- [ ] Webhook endpoints excluded from CSRF middleware via `VerifyCsrfToken::$except`
- [ ] Idempotency: check if gateway reference already processed before allocating

### Deliverable
- Parent enters phone, sees children and balances
- Selects fees, pays via Paystack or Flutterwave
- Webhook confirms payment and allocates to correct student records
- Combined receipt is downloadable
- Admin sees online payments in fee records

---

## Phase 10: Notifications, Audit Logs & Settings

### Goals
Automate alerts, ensure accountability, and give SuperAdmin control over the system configuration.

### Notifications

**In-App Notifications** (Laravel Database Notifications)
- `StudentAbsenceAlert` → Admin: "Student X has been absent 3 consecutive days"
- `OverdueFeeAlert` → Admin: "5 students in Level 2 have overdue fees"
- `LeaveRequestPending` → Admin: "Teacher Y has submitted a leave request"
- `LeaveRequestDecision` → Teacher: "Your leave request was approved/rejected"
- `OnlinePaymentReceived` → Admin: "Online payment of ₦33,500 received from 0801XXXXXXX"

**SMS/Email Notifications to Parents** (queued jobs)
- `AbsenceSmsTrigger` → fires when student marked absent (optional, configurable per school)
- `FeeReminderSms` → batch job run on schedule (e.g., 1st of month)
- `PaymentConfirmationSms` → fires after successful online payment

```php
// app/Jobs/SendSmsNotification.php
// Integrates with Termii or Africa's Talking API
// Queue: 'notifications'
```

### Audit Logs

**`audit_logs` table:**
```php
$table->id();
$table->foreignId('user_id')->nullable()->constrained();
$table->string('event');              // created, updated, deleted, login, payment_recorded
$table->string('auditable_type');     // Model class
$table->unsignedBigInteger('auditable_id');
$table->json('old_values')->nullable();
$table->json('new_values')->nullable();
$table->string('ip_address')->nullable();
$table->string('user_agent')->nullable();
$table->timestamps();
```

- Create an `AuditLog::record(event, model, old, new)` helper
- Call it in key service methods (payment recorded, student promoted, user created)
- SuperAdmin view: paginated table with filters by event type, user, date range
- Not editable or deletable by anyone

### Academic Year Management

- Create new academic year
- Set as "current" (only one can be current at a time — use DB transaction)
- Rolling over: prompt Admin to promote eligible students before closing the year
- Archived years remain queryable for historical reports

### System Settings (SuperAdmin)

Stored in `settings` table (key-value):
```php
$table->string('key')->unique();
$table->text('value')->nullable();
$table->string('type')->default('string'); // string, boolean, integer, json
```

Settings include:
| Key | Default | Description |
|---|---|---|
| `school_name` | — | Displayed on receipts and headers |
| `school_logo` | — | Path to logo file |
| `absence_alert_threshold` | `3` | Consecutive absences before alert |
| `fee_reminder_day` | `1` | Day of month to send fee SMS reminders |
| `sms_enabled` | `false` | Master SMS toggle |
| `email_enabled` | `true` | Master email toggle |
| `paystack_enabled` | `true` | Show Paystack on payment portal |
| `flutterwave_enabled` | `true` | Show Flutterwave on payment portal |

Access via `Settings::get('key', $default)` helper.

### Deliverable
- Admin receives in-app alerts for absences, fees, and leave requests
- Optional SMS to parents works when enabled
- Audit log records all critical actions
- SuperAdmin can configure the system via the settings panel

---

## Phase 11: Testing, Security Hardening & Deployment

### Goals
Ensure the system is reliable, secure, and ready for production.

### Testing

**Feature Tests (PHPUnit):**

| Test Class | Covers |
|---|---|
| `AuthTest` | Login, role redirect, forbidden access |
| `StudentManagementTest` | Enrollment, edit, search, soft-delete |
| `AttendanceTest` | Bulk submit, duplicate prevention, edit |
| `FeeTest` | Structure creation, payment recording, balance calc |
| `MemorizationTest` | Session log, progress aggregate update |
| `PromotionTest` | Bulk promotion, history record, re-enrollment |
| `PaymentPortalTest` | Phone lookup, gateway initiation, webhook processing |
| `WebhookTest` | Signature verification, idempotency, allocation accuracy |
| `ReportExportTest` | PDF and Excel download without errors |

Run with: `php artisan test --parallel`

### Security Hardening

- **Rate limiting:** Apply `throttle:60,1` globally; `throttle:10,15` on payment portal lookup
- **Input validation:** All form requests use dedicated `FormRequest` classes with strict validation rules
- **CSRF:** All non-webhook POST routes have CSRF. Webhooks are in `VerifyCsrfToken::$except`
- **Webhook validation:** Both Paystack and Flutterwave webhooks verify signatures before touching DB
- **Idempotency:** Payment processing checks for existing `gateway_reference` before inserting
- **File uploads:** Student photos validated for mime type (jpeg/png), max 2MB, stored outside public root
- **SQL Injection:** All queries use Eloquent/Query Builder — no raw user input interpolated
- **XSS:** All Blade output uses `{{ }}` (auto-escaped). `{!! !!}` only for DomPDF-rendered HTML with sanitized data
- **Authorization:** Every controller action calls `$this->authorize()` or checks policy before proceeding
- **Sensitive .env values:** Never committed. Production uses server environment variables

### Production Deployment Checklist

```bash
# Environment
APP_ENV=production
APP_DEBUG=false
APP_KEY=  # generated with php artisan key:generate

# Caching (run on deploy)
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Database
php artisan migrate --force

# Storage link
php artisan storage:link

# Queue worker (use Supervisor)
php artisan queue:work --queue=default,notifications --sleep=3 --tries=3

# Scheduled tasks (crontab)
* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

**Scheduled Jobs:**
- `DailyFeeReminderJob` — runs on `fee_reminder_day` setting each month
- `WeeklyRevisionReminderJob` — flags overdue revision items
- `MonthlyAttendanceReportJob` — generates and stores attendance summary snapshots

### Deliverable
- Full test suite passes
- No critical security issues
- Deployment config documented
- Queue worker and cron configured

---

## Dependency Map

```
Phase 1 (Setup)
    └─► Phase 2 (Auth & Roles)
            └─► Phase 3 (Students & Classes)
                    ├─► Phase 4 (Attendance)
                    ├─► Phase 5 (Fees)
                    │       └─► Phase 9 (Payment Portal)
                    ├─► Phase 6 (Memorization)
                    └─► Phase 7 (Promotions & Alumni)
                            └─► Phase 8 (Reports)
                                    └─► Phase 10 (Notifications, Audit, Settings)
                                            └─► Phase 11 (Testing & Deploy)
```

---

## Package Summary

| Package | Purpose |
|---|---|
| `laravel/breeze` | Auth scaffolding (blade stack) |
| `livewire/livewire` | Reactive UI components |
| `spatie/laravel-permission` | Role seeding helpers (using direct role column) |
| `barryvdh/laravel-dompdf` | PDF generation (receipts, reports) |
| `maatwebsite/excel` | Excel/CSV exports |
| `unicodeveloper/laravel-paystack` | Paystack integration |
| `kingflamez/laravelrave` | Flutterwave integration |
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/forms` | Form element Tailwind reset |
| `alpinejs` | Lightweight JS for UI interactions |

---

*11 phases. Each phase has a clearly defined scope, deliverable, and dependency. Start Phase 1 to begin.*
