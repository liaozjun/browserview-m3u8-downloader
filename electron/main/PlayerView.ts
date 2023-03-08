import _ from 'lodash'
import { ipcMain } from 'electron'
import * as fsPromise from 'node:fs/promises';
import {Setting} from '../Dtos/Setting'
import {TaskM3u8Dto} from '../Dtos/TaskM3u8Dto'
import { ePlayJi } from '../Dtos/ePlayJi';
import {BrowserViewMgr} from '../BrowserViewDomain/BrowserViewMgr'
import { DownloadStatus } from '../Enums/DownloadStatus';
export class PlayerView{
    static setting:Setting
    private _m3u8Service:any
    taskM3u8DtoList:Array<TaskM3u8Dto>

    constructor(m3u8Service:any){
        this._m3u8Service = m3u8Service;
        PlayerView.setting = new Setting();
        this.taskM3u8DtoList = new Array<TaskM3u8Dto>();
    }
    
     delay = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
    async init():Promise<void>{
        let self = this;
        let val:Setting = await this.getSettingAsync();
        PlayerView.setting.requestTsCountPreM3u8 = val.requestTsCountPreM3u8;
        ipcMain.handle('getPlayList', async (event, args) => {
            //console.log('getPlayList args',args);
            let result = self.GetPlayList(args.pageIndex,args.pageSize)
            return result
        })
        ipcMain.handle('save-setting',async (event,args:Setting)=>{
            //保存配置
            let path = `${process.resourcesPath}/setting.json`;
            PlayerView.setting.requestTsCountPreM3u8 = args.requestTsCountPreM3u8;
            await fsPromise.writeFile(path,JSON.stringify(args));                      
        })
        ipcMain.handle('get-setting',async(event,args)=>{           
            return PlayerView.setting;
        });
        ipcMain.on('CancelM3u8FormImport', async (event,args:ePlayJi)=>{
            let taskTmp:TaskM3u8Dto = self.taskM3u8DtoList.find(t=>t.id== args.id)
            if(taskTmp != null){
                taskTmp.cancel()
            }
        })
        ipcMain.on('DownloadM3u8FormImport', async (event,args:ePlayJi)=>{
            let taskTmp:TaskM3u8Dto = self.taskM3u8DtoList.find(t=>t.id== args.id)
            if(taskTmp == undefined){
                let task = new TaskM3u8Dto(args,self._m3u8Service)
                let flag:boolean = await task.Start()                
                if(flag){
                    self.taskM3u8DtoList.push(task);
                }
            }else{
                let mainWin = BrowserViewMgr.mainWin;
                if(taskTmp.FakeThreadAllEnd()){
                    let normalTsCount = taskTmp.playTsDtoList.filter(item=>item.status == DownloadStatus.Normal_).length
                    let errorTsCount = taskTmp.playTsDtoList.filter(item=>item.status == DownloadStatus.Error_).length
                    if(normalTsCount == 0 && errorTsCount != 0){
                        mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                            PlayJigId: taskTmp.gId,
                            PlayJiId: taskTmp.id,
                            success:false,message:'重新下载失败Ts'
                        })
                        let flag:boolean = await taskTmp.Start()
                        if(!flag){
                            _.remove(self.taskM3u8DtoList,t=>t.id=args.id)
                        }
                    }else{
                        mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                            PlayJigId: taskTmp.gId,
                            PlayJiId: taskTmp.id,
                            success:false,message:'请播放'
                        })
                    }
                }else{
                    mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                        PlayJigId: taskTmp.gId,
                        PlayJiId: taskTmp.id,
                        success:false,message:'已在队列中'
                    })
                }
            }            
        })
    }
    public async getSettingAsync(): Promise<Setting>{
        let path = `${process.resourcesPath}/setting.json`
        const contents = await fsPromise.readFile(path, { encoding: 'utf8' })
        let val:Setting = JSON.parse(contents)
        return val
    }
    GetPlayList(pageIndex: number, pageSize :number):any{
        return this._m3u8Service.GetAll(JSON.stringify({ pageIndex: pageIndex, pageSize :pageSize}))
    }
}