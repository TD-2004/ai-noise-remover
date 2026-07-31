import { pgTable, uuid, varchar, timestamp, integer, text } from 'drizzle-orm/pg-core';

export const audioJobs = pgTable('audio_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  originalFileSize: integer('original_file_size').notNull(),
  processedFilename: varchar('processed_filename', { length: 255 }),
  processedFileSize: integer('processed_file_size'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, processing, completed, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
