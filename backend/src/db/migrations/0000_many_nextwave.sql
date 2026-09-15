CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`service_id` text,
	`practice` text NOT NULL,
	`date` text NOT NULL,
	`time_slot` text NOT NULL,
	`duration` integer NOT NULL,
	`status` text NOT NULL,
	`presence_status` text,
	`notes` text,
	`cabinet_number` text,
	`cancellation_reason` text,
	`cancellation_type` text,
	`canceled_at` text,
	`previous_appointment_id` text,
	`replacement_appointment_id` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `doctor_schedules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`doctor_id` text NOT NULL,
	`day` text NOT NULL,
	`morning_active` integer DEFAULT true NOT NULL,
	`evening_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_doctor_day_schedule` ON `doctor_schedules` (`doctor_id`,`day`);--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`specialty` text NOT NULL,
	`practice` text NOT NULL,
	`phone` text NOT NULL,
	`avatar` text,
	`working_hours` text,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`practice` text NOT NULL,
	`recorded_by` text NOT NULL,
	`description` text,
	`receipt_number` text
);
--> statement-breakpoint
CREATE TABLE `financial_obligations` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`appointment_id` text,
	`service_id` text,
	`practice` text NOT NULL,
	`service_date` text NOT NULL,
	`record_date` text NOT NULL,
	`service_name` text NOT NULL,
	`total_cost` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`net_cost` integer NOT NULL,
	`due_date` text,
	`notes` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`obligation_id` text,
	`patient_id` text NOT NULL,
	`appointment_id` text,
	`practice` text NOT NULL,
	`record_date` text NOT NULL,
	`service_date` text,
	`paid_amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`payment_account_id` text,
	`pos_account` text,
	`timestamp` text,
	`debt_due_date` text,
	`notes` text,
	FOREIGN KEY (`obligation_id`) REFERENCES `financial_obligations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_account_id`) REFERENCES `payment_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `follow_up_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`practice` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text NOT NULL,
	`result_note` text,
	`updated_at` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patient_practice_memberships` (
	`patient_id` text NOT NULL,
	`practice` text NOT NULL,
	`physical_file_number` text NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`patient_id`, `practice`),
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_practice_physical_file` ON `patient_practice_memberships` (`practice`,`physical_file_number`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`file_number` text,
	`national_id` text,
	`name` text NOT NULL,
	`mobile` text NOT NULL,
	`gender` text,
	`birth_date` text,
	`primary_practice` text,
	`allergies` text,
	`medical_notes` text,
	`emergency_contact` text,
	`profile_status` text DEFAULT 'completed' NOT NULL,
	`username` text,
	`password` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`practice` text NOT NULL,
	`price` integer NOT NULL,
	`duration` integer NOT NULL,
	`description` text,
	`default_payment_term_days` integer DEFAULT 10 NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_code_unique` ON `services` (`code`);--> statement-breakpoint
CREATE TABLE `payment_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`practice` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `online_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_name` text NOT NULL,
	`mobile` text NOT NULL,
	`national_id` text,
	`target_practice` text NOT NULL,
	`doctor_id` text NOT NULL,
	`requested_date` text NOT NULL,
	`requested_time_slot` text NOT NULL,
	`request_type` text,
	`proposed_dates` text,
	`notes` text,
	`status` text NOT NULL,
	`rejection_reason` text,
	`rejected_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clinic_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
