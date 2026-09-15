import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../storage/project.js';

export interface FileModificationRecord {
  agentId: string;
  taskId?: string;
  timestamp: string;
  contentSnapshot?: string;
}

export interface FileConflict {
  id: string;
  filePath: string;
  firstAgent: string;
  secondAgent: string;
  firstContent?: string;
  secondContent?: string;
  detectedAt: string;
  resolved: boolean;
  resolution?: 'keep_first' | 'keep_second' | 'merged';
}

class ConflictManager {
  private fileOwners: Map<string, FileModificationRecord> = new Map();
  private conflicts: FileConflict[] = [];

  private normalize(filePath: string): string {
    return path.normalize(filePath);
  }

  checkOrRecordWrite(
    agentId: string,
    filePath: string,
    content: string,
    taskId?: string
  ): { hasConflict: boolean; conflict?: FileConflict } {
    const norm = this.normalize(filePath);
    const existing = this.fileOwners.get(norm);

    if (existing && existing.agentId !== agentId) {
      // Conflict detected!
      const conflict: FileConflict = {
        id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filePath: norm,
        firstAgent: existing.agentId,
        secondAgent: agentId,
        firstContent: existing.contentSnapshot,
        secondContent: content,
        detectedAt: new Date().toISOString(),
        resolved: false
      };
      this.conflicts.push(conflict);
      // Update record to current writer
      this.fileOwners.set(norm, {
        agentId,
        taskId,
        timestamp: new Date().toISOString(),
        contentSnapshot: content
      });
      return { hasConflict: true, conflict };
    }

    // No conflict, record write
    this.fileOwners.set(norm, {
      agentId,
      taskId,
      timestamp: new Date().toISOString(),
      contentSnapshot: content
    });
    return { hasConflict: false };
  }

  getConflicts(): FileConflict[] {
    return [...this.conflicts];
  }

  getUnresolvedConflicts(): FileConflict[] {
    return this.conflicts.filter(c => !c.resolved);
  }

  resolveConflict(conflictId: string, resolution: 'keep_first' | 'keep_second' | 'merged', mergedContent?: string): FileConflict {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) throw new Error(`Conflict not found: ${conflictId}`);
    conflict.resolved = true;
    conflict.resolution = resolution;
    return conflict;
  }

  reset(): void {
    this.fileOwners.clear();
    this.conflicts = [];
  }
}

export const conflictManager = new ConflictManager();
