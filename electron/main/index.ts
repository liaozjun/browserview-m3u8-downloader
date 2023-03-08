import { app, BrowserWindow, shell, ipcMain,Menu } from 'electron'
import { release } from 'node:os'
import { join,basename } from 'node:path'
import { dialog } from 'electron'
import * as fsPromise from 'node:fs/promises' 
import * as npath from 'node:path'
let appPath:string = app.getAppPath();
appPath = process.resourcesPath;
console.log(appPath);
let myplugin = require(`${appPath}/ivcaddon.node`)
let _m3u8Service = new myplugin.M3u8Service();
console.log(myplugin.Setting(JSON.stringify({ isPackaged: false, appPath:appPath})))

ipcMain.handle('DeleteDir',async (event,args)=>{
    let dir:string = `${process.resourcesPath}/m3u8/${args.folder_name}/`
    _m3u8Service.DeleteDir(dir)
})
ipcMain.handle('GetGuid',async(event,args)=>{    
    let guid:string = myplugin.GetGuid()
    return guid;
})
ipcMain.handle('InsertOrUpdateM3u8Data',async(event,args)=>{
    return _m3u8Service.InsertOrUpdateM3u8Data(JSON.stringify(args))
})
ipcMain.handle('DeleteM3u8Data',async(event,args)=>{
    return _m3u8Service.Delete(args)
})
ipcMain.handle('showOpenDialog', async (event,args)=>{
    try{
        let ret = await dialog.showOpenDialog({ 
            properties: ['openFile'] ,
            filters: [
                { name: 'json', extensions: ['json'] },
            ]
        })
        if(ret.canceled){
            return null;             
        }
        let bname = npath.basename(ret.filePaths[0])
        console.log(bname)
        let contents = await fsPromise.readFile(ret.filePaths[0],{ encoding: 'utf8' })        
        let playList  = JSON.parse(contents)
        return {basename:bname, playList:playList};
    } catch (err) {
        console.error(err.message);
        return null;
    }
})
ipcMain.handle('ExecuteNonQuery',async(event,args)=>{
    return myplugin.ExecuteNonQuery(args)
})
ipcMain.handle('ExecuteNonQueryRetrunId',async(event,args)=>{
    return myplugin.ExecuteNonQueryRetrunId(args)
})
ipcMain.handle('ExecuteReader',async(event,args)=>{
    return myplugin.ExecuteReader(args)
})

import {PlayerView} from '../main/PlayerView';
let _playerView:PlayerView;

import {BrowserViewMgr} from '../BrowserViewDomain/BrowserViewMgr';
let _browserViewMgr:BrowserViewMgr ;

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
    if(process.env.VITE_DEV_SERVER_URL){
        //Menu.setApplicationMenu(null)
    }else{
        Menu.setApplicationMenu(null)
    }

    _playerView = new PlayerView(_m3u8Service)
    await _playerView.init()

    win = new BrowserWindow({
        
        title: 'browserview-m3u8-downloader',
        icon: join(process.env.PUBLIC, 'favicon.ico'),
        webPreferences: {
        preload,
        // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
        // Consider using contextBridge.exposeInMainWorld
        // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
        nodeIntegration: true,
        contextIsolation: false,
        },
    })
    win.maximize();
    if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
            win.loadURL(url)
            //win.loadFile(`E:/browserview-m3u8-downloader/dist/index.html`)
            // Open devTool if the app is not packaged
            win.webContents.openDevTools()
    } else {
        win.loadFile(indexHtml)
    }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  BrowserViewMgr.mainWin = win;
  _browserViewMgr = new BrowserViewMgr(_m3u8Service)
  _browserViewMgr.init()

  myplugin.StartMongoose();
}

app.whenReady().then(createWindow)

app.on('window-all-closed', async() => {
    //const path = await netLog.stopLogging()
    //console.log('Net-logs written to', path)
    myplugin.StopMongoose();
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
