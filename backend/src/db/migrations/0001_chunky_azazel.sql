CREATE TABLE `excel_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`practice` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'preview' NOT NULL,
	`total_records` integer DEFAULT 0 NOT NULL,
	`valid_count` integer DEFAULT 0 NOT NULL,
	`missing_name_count` integer DEFAULT 0 NOT NULL,
	`missing_pc_count` integer DEFAULT 0 NOT NULL,
	`invalid_phone_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `excel_import_records` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`excel_row_number` integer NOT NULL,
	`practice` text NOT NULL,
	`raw_pc` text,
	`raw_name` text,
	`raw_phone` text,
	`normalized_pc` text,
	`normalized_name` text,
	`normalized_phone` text,
	`category` text NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`duplicate_target_patient_id` text,
	`duplicate_target_record_id` text,
	`duplicate_reason` text,
	`duplicate_resolution` text DEFAULT 'unresolved' NOT NULL,
	`imported_patient_id` text,
	`status` text DEFAULT 'staged' NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `excel_import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_follow_up_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text,
	`doctor_id` text,
	`practice` text NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`description` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text NOT NULL,
	`result_note` text,
	`updated_at` text,
	`created_at` text,
	`completed_at` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_follow_up_tasks`("id", "patient_id", "doctor_id", "practice", "type", "description", "due_date", "status", "result_note", "updated_at") SELECT "id", "patient_id", "doctor_id", "practice", "type", "description", "due_date", "status", "result_note", "updated_at" FROM `follow_up_tasks`;--> statement-breakpoint
DROP TABLE `follow_up_tasks`;--> statement-breakpoint
ALTER TABLE `__new_follow_up_tasks` RENAME TO `follow_up_tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `online_requests` ADD `appointment_id` text REFERENCES appointments(id);