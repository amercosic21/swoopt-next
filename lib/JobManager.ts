import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { DOWNLOADS_DIR, JOBS_DIR, JOB_TTL } from './config';
import type { Job, JobStatus } from '@/types';

function jobPath(jobId: string): string {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function readJobFile(filePath: string): Job | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data as Job;
  } catch {
    return null;
  }
}

function writeJobFile(filePath: string, job: Job): void {
  fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf-8');
}

export function createJob(url: string, format: string, type: string): Job {
  const id = randomUUID();
  const outputDir = path.join(DOWNLOADS_DIR, id, '/');

  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const job: Job = {
    id,
    url,
    format,
    type: type as Job['type'],
    status: 'queued',
    progress: 0,
    current_item: 0,
    total_items: 0,
    current_title: '',
    output_dir: outputDir,
    files: [],
    error: null,
    pid: null,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  };

  writeJobFile(jobPath(id), job);
  return job;
}

export function getJob(jobId: string): Job {
  const p = jobPath(jobId);
  if (!fs.existsSync(p)) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const job = readJobFile(p);
  if (!job) {
    throw new Error(`Corrupt job file: ${jobId}`);
  }
  return job;
}

export function updateJob(jobId: string, changes: Partial<Job>): void {
  const p = jobPath(jobId);
  if (!fs.existsSync(p)) return;

  const job = readJobFile(p);
  if (!job) return;

  const updated = {
    ...job,
    ...changes,
    updated_at: Math.floor(Date.now() / 1000),
  };

  writeJobFile(p, updated);
}

export function getAllJobs(limit = 50, offset = 0): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return [];

  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs: Job[] = [];

  for (const file of files) {
    const job = readJobFile(path.join(JOBS_DIR, file));
    if (job) jobs.push(job);
  }

  jobs.sort((a, b) => b.created_at - a.created_at);
  return jobs.slice(offset, offset + limit);
}

export function countByStatus(status: JobStatus): number {
  if (!fs.existsSync(JOBS_DIR)) return 0;

  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  let count = 0;

  for (const file of files) {
    const job = readJobFile(path.join(JOBS_DIR, file));
    if (job && job.status === status) count++;
  }

  return count;
}

export function getByStatus(status: JobStatus, limit = 10): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return [];

  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const jobs: Job[] = [];

  for (const file of files) {
    const job = readJobFile(path.join(JOBS_DIR, file));
    if (job && job.status === status) jobs.push(job);
  }

  jobs.sort((a, b) => a.created_at - b.created_at);
  return jobs.slice(0, limit);
}

export function deleteJob(jobId: string): void {
  const p = jobPath(jobId);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
  }
}

export function purgeExpired(): void {
  if (!fs.existsSync(JOBS_DIR)) return;

  const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
  const cutoff = Math.floor(Date.now() / 1000) - JOB_TTL;
  const terminalStatuses: JobStatus[] = ['completed', 'failed', 'cancelled'];

  for (const file of files) {
    const p = path.join(JOBS_DIR, file);
    const job = readJobFile(p);
    if (!job) {
      fs.unlinkSync(p);
      continue;
    }
    if (terminalStatuses.includes(job.status) && job.updated_at < cutoff) {
      fs.unlinkSync(p);
    }
  }
}
