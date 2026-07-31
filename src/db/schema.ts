import { pgTable, uuid, varchar, timestamp, integer, text, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return value;
  },
});

export const audioJobs = pgTable('audio_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  originalFileSize: integer('original_file_size').notNull(),
  originalData: bytea('original_data'),
  processedFilename: varchar('processed_filename', { length: 255 }),
  processedFileSize: integer('processed_file_size'),
  processedData: bytea('processed_data'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
