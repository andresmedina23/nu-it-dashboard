import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Credentials
  getCredStatus: () => ipcRenderer.invoke('creds:status'),
  discoverCLI: () => ipcRenderer.invoke('cli:discover'),

  // PTY
  ptyStart: (id: string, command: string, args: string[]) =>
    ipcRenderer.invoke('pty:start', { id, command, args }),
  ptyScript: (id: string, script: string) =>
    ipcRenderer.invoke('pty:script', { id, script }),
  ptyInput: (id: string, data: string) =>
    ipcRenderer.send('pty:input', { id, data }),
  ptyKill: (id: string) =>
    ipcRenderer.send('pty:kill', id),
  ptyResize: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('pty:resize', { id, cols, rows }),
  onPtyData: (id: string, cb: (data: string) => void) => {
    ipcRenderer.on(`pty:data:${id}`, (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(`pty:data:${id}`)
  },
  onPtyExit: (id: string, cb: (code: number) => void) => {
    ipcRenderer.once(`pty:exit:${id}`, (_, code) => cb(code))
  },

  // Shell
  openExternal: (url: string) => ipcRenderer.send('shell:open', url),

  // Google Sheets Sync
  sheetsConfigGet: () => ipcRenderer.invoke('sheets:config:get'),
  sheetsConfigSet: (cfg: object) => ipcRenderer.invoke('sheets:config:set', cfg),
  sheetsStart: () => ipcRenderer.invoke('sheets:start'),
  sheetsStop: () => ipcRenderer.send('sheets:stop'),
  sheetsUpdate: (payload: { serial: string; action: string; status?: string }) =>
    ipcRenderer.invoke('sheets:update', payload),
  onSheetsChange: (cb: (changes: unknown[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, changes: unknown[]) => cb(changes)
    ipcRenderer.on('sheets:change', handler)
    return () => ipcRenderer.removeListener('sheets:change', handler)
  },
  sheetsCheckConnection: (webAppUrl: string) => ipcRenderer.invoke('sheets:connection:check', webAppUrl),
  sheetsSignIn: () => ipcRenderer.invoke('sheets:signin'),
  sheetsQuery: (serial: string) => ipcRenderer.invoke('sheets:query', serial),
})
