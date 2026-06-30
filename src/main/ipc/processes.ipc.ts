import { ipcMain } from 'electron';
import type { GraphValidationResult, ProcessGraph, ProcessJob } from '../../shared/types/config.types';
import type { ProcessRuntimeService } from '../services/process-runtime/process-runtime.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerProcessesIpc(processRuntimeService: ProcessRuntimeService): void {
  ipcMain.handle(
    IPC_CHANNELS.processes.validateGraph,
    async (_event, graph: ProcessGraph): Promise<GraphValidationResult> =>
      processRuntimeService.validateGraph(graph)
  );

  ipcMain.handle(
    IPC_CHANNELS.processes.startJob,
    async (_event, processId: string, input?: Record<string, unknown>): Promise<ProcessJob> =>
      processRuntimeService.startJob(processId, input ?? {})
  );

  ipcMain.handle(
    IPC_CHANNELS.processes.getJob,
    async (_event, jobId: string): Promise<ProcessJob | null> => processRuntimeService.getJob(jobId)
  );
}
