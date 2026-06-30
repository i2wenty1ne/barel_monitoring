import { ipcMain } from 'electron';
import type {
  Command,
  CommandHistoryQuery,
  CommandResult,
  ExecuteCommandRequest
} from '../../shared/types/config.types';
import type { CommandService } from '../services/command/command.service';
import { IPC_CHANNELS } from './ipc-channels';

export function registerCommandsIpc(commandService: CommandService): void {
  ipcMain.handle(
    IPC_CHANNELS.commands.execute,
    async (_event, request: ExecuteCommandRequest): Promise<CommandResult> => commandService.execute(request)
  );

  ipcMain.handle(
    IPC_CHANNELS.commands.getHistory,
    async (_event, query?: CommandHistoryQuery): Promise<Command[]> => commandService.getHistory(query)
  );
}
