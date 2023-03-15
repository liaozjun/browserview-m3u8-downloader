import _ from 'lodash'
import { ipcMain } from 'electron'
import * as fsPromise from 'node:fs/promises'
import {Setting} from '../Dtos/Setting'
import {TaskM3u8Dto} from '../Dtos/TaskM3u8Dto'
import { ePlayJi } from '../Dtos/ePlayJi'
import {BrowserViewMgr} from '../BrowserViewDomain/BrowserViewMgr'
import { DownloadStatus } from '../Enums/DownloadStatus'
const { spawn } = require('node:child_process')
import * as fs from 'node:fs'
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
        ipcMain.handle('combine_ts_mp4',(event,args1:{id:number
            player:string
            name:string
            url:string
            status:DownloadStatus
            gId:number
            groupName:string
            folder_name:string
            reportsProgress:string})=>{
            let mainWin = BrowserViewMgr.mainWin;
            let ffmpegPath = `${process.resourcesPath}\\ffmpeg.exe`
            let path = `${process.resourcesPath}\\m3u8\\${args1.folder_name}\\index.m3u8`;
                let outputDir = `${process.resourcesPath}\\Output\\${args1.groupName}\\`
                let outputFile = `${outputDir}${args1.name}.mp4`
                this._m3u8Service.DirNotExistCreate(outputDir)
            try{
                
                let cmd = ffmpegPath
                let args = [
                    '-allowed_extensions', 'ALL',
                    '-protocol_whitelist', 'file,http,crypto,tcp',            
                    '-i', path,           
                    '-y', '-c','copy',outputFile,
                ]

                let is_lm3u8Exist = fs.statSync(outputFile,{throwIfNoEntry :false})        
                if(is_lm3u8Exist == undefined){//不存在下载
                    let proc = spawn(cmd, args);    
                    proc.stdout.on('data', function(data) {
                        mainWin.webContents.send('combine_ts_mp4_reply',{
                            playJiId:args1.id,
                            playJiGroupId:args1.gId,
                            isEnd:false,
                            isError:false,
                            message: ''
                        })
                    });
                    proc.stderr.setEncoding("utf8")
                    proc.stderr.on('data', function(data) {
                        mainWin.webContents.send('combine_ts_mp4_reply',{
                            playJiId:args1.id,
                            playJiGroupId:args1.gId,
                            isEnd:false,
                            isError:false,
                            message: ''
                        })
                    });
                    proc.on('close', function() {
                        mainWin.webContents.send('combine_ts_mp4_reply',{
                            playJiId:args1.id,
                            playJiGroupId:args1.gId,
                            isEnd:true,
                            isError:false,
                            message: '',
                            openDir:outputFile
                        })
                    });
                }else{
                    mainWin.webContents.send('combine_ts_mp4_reply',{
                        playJiId:args1.id,
                        playJiGroupId:args1.gId,
                        isEnd:true,
                        isError:true,
                        openDir:outputFile,
                        message: '已经存在'
                    })
                }
            }catch(err){
                mainWin.webContents.send('combine_ts_mp4_reply',{
                    playJiId:args1.id,
                    playJiGroupId:args1.gId,
                    isEnd:true,
                    isError:true,
                    openDir:outputFile,
                    message: JSON.stringify(err)
                })
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