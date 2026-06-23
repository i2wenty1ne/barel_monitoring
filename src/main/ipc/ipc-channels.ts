export const IPC_CHANNELS = {
  config: {
    get: 'config:get',
    save: 'config:save',
    reload: 'config:reload',
    reset: 'config:reset'
  },
  monitoring: {
    getSnapshot: 'monitoring:get-snapshot',
    readAllNow: 'monitoring:read-all-now',
    testConnection: 'monitoring:test-connection',
    getStatus: 'monitoring:get-status',
    snapshotUpdated: 'monitoring:snapshot-updated'
  },
  events: {
    list: 'events:list',
    clear: 'events:clear',
    entryCreated: 'events:entry-created'
  },
  system: {
    getInfo: 'system:get-info',
    openConfigFolder: 'system:open-config-folder',
    openLogsFolder: 'system:open-logs-folder'
  }
} as const;
