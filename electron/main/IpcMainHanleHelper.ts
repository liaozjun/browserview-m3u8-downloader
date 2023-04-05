import {ipcMain, shell, dialog} from 'electron'
import * as fsPromise from 'node:fs/promises' 
import * as npath from 'node:path'

export class IpcMainHanleHelper{
    
    constructor(pmyplugin:any, m3u8Service:any ){
        let myplugin:any = pmyplugin
        let _m3u8Service:any = m3u8Service
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
        ipcMain.handle('showOpenDialogv1', async (event,args)=>{
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
                //let playList  = JSON.parse(contents)
                return {basename:bname, contents:contents};
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
        ipcMain.handle('openDir',(event,args)=>{
            shell.showItemInFolder(args)
        })
        
    }
}