import { DownloadStatus } from "../Enums/DownloadStatus";
import {ePlayJi} from './ePlayJi'
import {DownloadFileResult} from '../Dtos/DownloadFileResult'
import {ClientRequest, net } from 'electron'
import {BrowserViewMgr} from '../BrowserViewDomain/BrowserViewMgr'
import * as fsPromise from 'node:fs/promises'
import * as fs from 'node:fs';
import { Parser } from 'm3u8-parser'
import _ from 'lodash'
import {PlayerView} from '../main/PlayerView'
import { Setting } from "./Setting";
import { Utils } from "../main/Utils";
export class TaskM3u8Dto extends ePlayJi {
    playTsDtoList:Array<M3u8TsDto>
    canceled:boolean
    clientRequestMap:Map<number,ClientRequest>
    fakeThreadArray:Array<number>
    fakeThreadCount:number
    tsCount:number
    private _m3u8Service:any
    constructor(pj:ePlayJi,m3u8Service:any){
        super()
        this._m3u8Service = m3u8Service;

        this.id = pj.id
        this.gId = pj.gId
        this.folder_name = pj.folder_name
        this.name = pj.name
        this.player = pj.player
        this.status = pj.status
        this.url = pj.url
        this.playTsDtoList = new Array<M3u8TsDto>()
        this.canceled = false;
        this.fakeThreadCount = PlayerView.setting.requestTsCountPreM3u8
        this.fakeThreadArray = _.range(this.fakeThreadCount)
        this.clientRequestMap = new Map<number,ClientRequest>()
    }
    FakeThreadAllEnd():boolean{
        return this.fakeThreadArray.length == this.fakeThreadCount
    }
    async Start():Promise<boolean>{
        let self = this
        let mainWin = BrowserViewMgr.mainWin
        try{            
            self.canceled = false
            //文件夹
            let dir:string = `${process.resourcesPath}/m3u8/${self.folder_name}/`
            self._m3u8Service.DirNotExistCreate(dir)
            console.log(dir)
        //     原m3u8文件是否存在 否下载
            let parser = null
            let urlObj = new URL(self.url)
            var lastxg = self.url.lastIndexOf("/")
            var preurl = self.url.substring(0, lastxg + 1)

            //let om3u8filepath:string = `${dir}oindex.m3u8`
            let lom3u8filepath:string = `${dir}index.m3u8`

            let is_lm3u8Exist = fs.statSync(lom3u8filepath,{throwIfNoEntry :false})        
            if(is_lm3u8Exist == undefined){//不存在下载            
                mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                    PlayJigId: self.gId,
                    PlayJiId: self.id,
                    success:false,message:'下载解析中1'
                })
            
                let result:DownloadFileResult = await self._downloadFilePromise(-1,self.url)
                var txt = _.toString(result.blob);           
                parser = new Parser();
                parser.push(txt);
                parser.end();
                
                if(_.hasIn(parser.manifest,'playlists') && 
                    _.isArray(parser.manifest.playlists) && 
                    parser.manifest.playlists.length != 0
                ){
                    let plurl = parser.manifest.playlists[0].uri;                
                    if(_.startsWith(plurl,'/')){
                        plurl = `${urlObj.origin}${plurl}`
                    }else{
                        plurl = `${preurl}${plurl}`
                    }
                    mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                        PlayJigId: self.gId,
                        PlayJiId: self.id,
                        success:false,message:'下载解析中2'
                    })
                    let presult:DownloadFileResult = await self._downloadFilePromise(-1,plurl);
                    var txt = _.toString(presult.blob);  
                    parser = new Parser();
                    parser.push(txt);
                    parser.end();
                    //console.log(parser.manifest);
                }
                if(parser != null && _.hasIn(parser.manifest,'segments') && 
                    _.isArray(parser.manifest.segments) && 
                    parser.manifest.segments.length != 0){                    
                        //await fsPromise.writeFile(om3u8filepath, txt)
                        let lm3u8filepathtxt = Utils.DumpM3u8Index(parser.manifest)
                        await fsPromise.writeFile(lom3u8filepath, lm3u8filepathtxt)
                }
            }else{//存在
                mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                    PlayJigId: self.gId,
                    PlayJiId: self.id,
                    success:false,message:'读取解析中'
                })
                let txt = fs.readFileSync(lom3u8filepath,{encoding:'utf-8'})
                parser = new Parser();
                parser.push(txt);
                parser.end();
            }
            if(parser != null && _.hasIn(parser.manifest,'segments') && 
                _.isArray(parser.manifest.segments) && 
                parser.manifest.segments.length != 0){

                _.remove(self.playTsDtoList,p=>true)
                //本地m3u8
                _.forEach(parser.manifest.segments,seg=>{
                    var fileName = Utils.GetFileName(seg.uri)
                    let ts:M3u8TsDto  = new M3u8TsDto()
                    ts.name = fileName
                    ts.status = DownloadStatus.Normal_
                    ts.path =`${dir}${fileName}`
                    if(_.startsWith(seg.uri,'/')){//绝对路径              
                        ts.url = `${urlObj.origin}${seg.uri}`
                    }else{//相对路径
                        ts.url = `${preurl}${seg.uri}`
                    }
                    self.playTsDtoList.push(ts)
                })
                //如果有加密 生成key任务
                let fseg  = parser.manifest.segments[0];
                if(_.hasIn(fseg,'key')){
                    var fileName = Utils.GetFileName(fseg.key.uri)
                    let keyfile:M3u8TsDto  = new M3u8TsDto()
                    keyfile.name = fileName
                    keyfile.status = DownloadStatus.Normal_
                    keyfile.path =`${dir}${fileName}`
                    if(_.startsWith(fseg.key.uri,'/')){
                        keyfile.url = `${urlObj.origin}${fseg.key.uri}`
                    }else{
                        keyfile.url = `${preurl}${fseg.key.uri}`
                    }
                    self.playTsDtoList.push(keyfile)
                }
                self.tsCount = self.playTsDtoList.length
                //文件那个未下载

                _.forEach(self.playTsDtoList,(ts:M3u8TsDto)=>{
                    let is_tsExist = fs.statSync(ts.path,{throwIfNoEntry :false})
                    if(is_tsExist == undefined){
                        //ts.status = DownloadStatus.Error_
                    }else{
                        //已经下载
                        ts.status = DownloadStatus.Finish_
                    }
                })
                self.status = DownloadStatus.Downloading_

                let fakeThreadArrayDismiss = _.clone(self.fakeThreadArray);
                _.remove(self.fakeThreadArray,p=>true)
                //console.log(self.fakeThreadArray)
                while(fakeThreadArrayDismiss.length != 0){
                    let fakeThreadId = fakeThreadArrayDismiss.shift()
                    //console.log('start fakeThreadId',fakeThreadId)
                    self._downloadTs(fakeThreadId)
                }
                return true
            }
        }catch(err){
            _.remove(self.playTsDtoList)
            self.canceled = true
            mainWin.webContents.send('_WorkerReportsBeforeProgress',{
                PlayJigId: self.gId,
                PlayJiId: self.id,
                success:false,message:JSON.stringify(err)
            })
        }
        return false
    }
    cancel():void{
        this.canceled = true;
        this.clientRequestMap.forEach((value, key) => { 
            value.abort()
        })
    }
    //Stop
    private _downloadTs(fakeThreadId:number):void{
        let self = this        
        let val = self.clientRequestMap.get(fakeThreadId)
        if(val != undefined){
            self.clientRequestMap.delete(fakeThreadId)
        }
        //console.log(`id:${self.id},${fakeThreadId} info clientRequestMap`,self.clientRequestMap.keys());
        if(this.canceled){
            let tsListTmp = self.playTsDtoList.filter(ts=>ts.status == DownloadStatus.Normal_)
            _.forEach(tsListTmp,ts=>ts.status = DownloadStatus.Error_)
        }
        let normalTs = self.playTsDtoList.find(ts=>ts.status == DownloadStatus.Normal_)//.findNormalTsFirstOrUndefined();
        if(normalTs == undefined){
            //console.log('fakeThreadId end',fakeThreadId)            
            self._WorkerReportsProgress()
            self.fakeThreadArray.push(fakeThreadId);
            if(self.fakeThreadArray.length == self.fakeThreadCount){
                console.log('fakeThreadId end all',self.fakeThreadArray)
                console.log('clientRequestMap',self.clientRequestMap.keys());
                self.status = DownloadStatus.Finish_ 
                self._WorkerReportsProgress() 
            }
            return
        }
        try{
            normalTs.Downloading_()
            self._WorkerReportsProgress()
            self._downloadFilePromise(fakeThreadId, normalTs.url).then(async(res:DownloadFileResult)=>{
                try{
                    let path = `${process.resourcesPath}/m3u8/${self.folder_name}/${normalTs.name}`
                    await fsPromise.writeFile(path,res.blob)
                    normalTs.Finish()
                }catch(err){
                    normalTs.Error(err.message)
                }
                self._downloadTs(fakeThreadId)
            })
            .catch((rej:DownloadFileResult)=>{
                normalTs.Error(rej.msg);
                self._downloadTs(fakeThreadId)
            });
        }catch(err){
            normalTs.Error(`_downloadTs error ${JSON.stringify(err)}`);
            self._downloadTs(fakeThreadId)
        }
    }
    _WorkerReportsProgress(){
        let self = this;
        let normalTsCount = _.filter(self.playTsDtoList,(ts:M3u8TsDto)=> ts.status == DownloadStatus.Normal_).length// .filterNormalTs()
        let finishTsCount = _.filter(self.playTsDtoList,(ts:M3u8TsDto)=> ts.status == DownloadStatus.Finish_).length// .filterFinishTs()
        let downloadingTsCount = _.filter(self.playTsDtoList,(ts:M3u8TsDto) => ts.status == DownloadStatus.Downloading_).length// .filterDownloadingTs()
        let errorTsCount = _.filter(self.playTsDtoList,(ts:M3u8TsDto)=> ts.status == DownloadStatus.Error_).length// .filterErrorTs()
        let mainWin = BrowserViewMgr.mainWin;
        let statusInfo = {
            PlayJigId: self.gId,
            PlayJiId: self.id,
            tsCount: self.tsCount,
            normalTsCount:normalTsCount,
            finishTsCount:finishTsCount,
            downloadingTsCount:downloadingTsCount,
            errorTsCount:errorTsCount,
        }
        mainWin.webContents.send('_WorkerReportsProgress',statusInfo)
        //return statusInfo;
    }
    _downloadFilePromise(fakeThreadId:number, url:string):Promise<DownloadFileResult>{
        let self = this;
        let p = new Promise<DownloadFileResult>(function(resolve,reject){            
            try{
                let blob:Buffer = null;
                const request = net.request({
                    method: 'GET',
                    url: url,
                    session: BrowserViewMgr.mainWin.webContents.session,
                    useSessionCookies: true,
                });
                if(fakeThreadId != -1){
                    self.clientRequestMap.set(fakeThreadId,request)
                }
                request.on('login',(authInfo, callback)=>{
                    let result:DownloadFileResult = new DownloadFileResult(false,`request login`);
                    reject(result);
                })
                request.on('error',error=>{
                    let result:DownloadFileResult = new DownloadFileResult(false,`request error:${error.message}`);
                    reject(result);
                })
                request.on('abort',abort=>{
                    let result:DownloadFileResult = new DownloadFileResult(false,`request abort`);
                    reject(result);
                })
                request.on('redirect',redirect=>{
                    let result:DownloadFileResult = new DownloadFileResult(false,`request redirect`);
                    reject(result);
                })            
                request.on('response', (response) => {
                    response.on('aborted', ()=>{
                        let result:DownloadFileResult = new DownloadFileResult(false,'response aborted');
                        reject(result);
                    });
                    response.on('error',(error)=>{
                        let result:DownloadFileResult = new DownloadFileResult(false,`response error:${error.message}`);
                        reject(result);
                    });
                    response.on('end', async() => {
                        let result:DownloadFileResult = new DownloadFileResult(true,'');
                        result.blob = blob;
                        resolve(result);
                    });                
                    response.on('data', (chunk) => {
                        if(blob == null){            
                            blob = Buffer.concat([chunk]);
                        }else{
                            blob = Buffer.concat([blob,chunk]);
                        }
                    });            
                });
                request.end();
            }catch(err){
                let result:DownloadFileResult = new DownloadFileResult(false,`downloadFilePromise erro :${JSON.stringify(err)}`);
                reject(result);
            }
        });
        return p;
    }
}

class M3u8TsDto{
    status:DownloadStatus
    name:string
    url:string
    path:string
    msg:string
    constructor(){
        this.name= ''
        this.url = ''
        this.path = ''
        this.status = DownloadStatus.Normal_;
        this.msg = ''
    }
    Finish():void{
        this.status = DownloadStatus.Finish_;
    }
    Error(msg:string):void{
        this.status = DownloadStatus.Error_;
        this.msg = msg;
    }
    Downloading_():void{
        this.status = DownloadStatus.Downloading_;
    }
}