import {BrowserView,net} from 'electron'
import { BrowserViewMgr } from '../BrowserViewMgr'
import _ from 'lodash'
import { Parser } from 'm3u8-parser'
import {M3u8Data} from './M3u8Data'
import * as fsPromise from 'node:fs/promises'
import { PlayerView } from '../../main/PlayerView'
import {DownloadFileResult} from '../../Dtos/DownloadFileResult'
export class BrowserViewDto {
    
    private _browserView: BrowserView;
    public browserView_webContents_Id:number;

    m3u8Data:M3u8Data;
    //tabKey:string;
 
    fakeThreadCount:Array<number>;
    fakeThreadEndCount:number;
    
    constructor() { 
        this.browserView_webContents_Id = 0; 
        ///this.tabKey = ""
        this.m3u8Data = new M3u8Data()        
        this.fakeThreadCount = _.range(PlayerView.setting.requestTsCountPreM3u8)
        this.fakeThreadEndCount = 0
    }
    fakeThreadIsEnd():boolean{
        let self =this;
        return self.fakeThreadEndCount == self.fakeThreadCount.length
    }
    fakeThreadEndIncrease():void{
        this.fakeThreadEndCount++;
    }
    fakeThreadStart():void{
        this.fakeThreadEndCount = 0;
    }
    resetM3u8Data():void{
        this.m3u8Data.reset();
    }
    createBrowserView(args:any):void{        
        //this.tabKey = args.key;

        this._browserView = new BrowserView();
        this.browserView_webContents_Id = this._browserView.webContents.id;
        this._webContentsInit();

        let cbound = BrowserViewMgr.mainWin.getContentBounds();        
        BrowserViewMgr.mainWin.setBrowserView(this._browserView);
        let top = 118;
        this._browserView.setBounds({ x: 0, y: top, width: cbound.width, height: cbound.height - top  })
        this._browserView.webContents.loadURL(args.url);        
        
    }
    goBack():void{
        if(this._browserView.webContents.canGoBack()){
            this._browserView.webContents.goBack();
        }
    }
    goForward():void{
        if(this._browserView.webContents.canGoForward()){
            this._browserView.webContents.goForward();
        }
    }
    reload():void{
        this._browserView.webContents.reload();
    }

    loadURL(url:string):void{
        this._browserView.webContents.loadURL(url);
    }
    getBrowserView():BrowserView{
        return this._browserView;
    }
    getData():any{
        return {
            browserView_webContents_Id: this.browserView_webContents_Id,
            //tabKey: this.tabKey
        };
    }
    
    private _webContentsInit():void{
        let self = this;

        self._browserView.webContents.on('did-finish-load', (event) => {
            if(event.id != undefined && event.id != self.browserView_webContents_Id){
                throw new Error('did-finish-load browserView_webContents_Id 不一致')
            }
            let mainWin = BrowserViewMgr.mainWin;
            mainWin.webContents.send('browserview-event',{
                action:'did-finish-load',
                title: self._browserView.webContents.getTitle(),
                url: self._browserView.webContents.getURL(),
                browserView_webContents_Id: self._browserView.webContents.id
            });
        });

        self._browserView.webContents.setWindowOpenHandler(details =>{
            self._browserView.webContents.loadURL(details.url);
            return {action: 'deny'};
        });
    }
     _downloadM3u8Index(url:string):void{
        let self = this;
        let mainWin = BrowserViewMgr.mainWin;
        self._downloadFilePromise(url).then(async (res:DownloadFileResult) =>{           
            var txt = _.toString(res.blob);           
            const parser = new Parser();
            parser.push(txt);
            parser.end();

            if(_.hasIn(parser.manifest,'segments') && 
                _.isArray(parser.manifest.segments) && 
                parser.manifest.segments.length != 0
            ){
                self.m3u8Data.reset()
                self.m3u8Data.set(url,parser.manifest)
                let findM3u8Result = new FindM3u8Result()
                findM3u8Result.success(self._browserView.webContents.id, url, parser.manifest.segments.length)
                mainWin.webContents.send('find-m3u8',findM3u8Result)
            } else {
                //console.log(parser.manifest);
                //findM3u8Result.error(self.browserView_webContents_Id,url,'m3u8')
            }                  
        }).catch((rej:DownloadFileResult)=>{       
           // console.log('_downloadFilePromise catch ',rej)     
            let findM3u8Result = new FindM3u8Result()
            findM3u8Result.error(self.browserView_webContents_Id, url,`${rej.msg}` )
            mainWin.webContents.send('find-m3u8',findM3u8Result);
        });
    }
    public downloadM3u8( ):void{
        let self = this;
        self.m3u8Data.statusDownloading_();
        _.forEach(self.fakeThreadCount, function(value) {
            console.log('fakeThreadId',value)
            self._downloadTs(value)
        });
    }
    
    private _downloadTs(fakeThreadId:number):void{
        let self = this
        let normalTs = self.m3u8Data.findNormalTsFirstOrUndefined();
        if(normalTs == undefined){
            console.log('fakeThreadId end',fakeThreadId)
            let statusInfo = self.send_download_m3u8_ts_summary()
            self.fakeThreadEndIncrease();
            if(self.fakeThreadIsEnd()){                
                //finish-m3u8
                self.m3u8Data.statusFinish_();
                let mainWin = BrowserViewMgr.mainWin;
                mainWin.webContents.send('finish-m3u8',statusInfo);
            }
            return ;
        }
        try{
            normalTs.Downloading_()
            self.send_download_m3u8_ts_summary()
            self._downloadFilePromise(normalTs.url).then(async(res:DownloadFileResult)=>{
                try{
                    let path = `${process.resourcesPath}/m3u8/${self.m3u8Data.folder_name}/${normalTs.fileName}`
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
    
    _downloadFilePromise(url:string):Promise<DownloadFileResult>{
        let self = this;
        let p = new Promise<DownloadFileResult>(function(resolve,reject){            
            try{
                let blob:Buffer = null;
                const request = net.request({
                    method: 'GET',
                    url: url,
                    session: self._browserView.webContents.session,
                    useSessionCookies: true,
                });            
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
                let result:DownloadFileResult = new DownloadFileResult(false,`_downloadFilePromise erro :${JSON.stringify(err)}`);
                reject(result);
            }
        });
        return p;
    }
    private send_download_m3u8_ts_summary(){
        try{
            let self = this;
            //发送 下载简要
            let normalTsCount = self.m3u8Data.filterNormalTs()
            let finishTsCount = self.m3u8Data.filterFinishTs()
            let downloadingTsCount = self.m3u8Data.filterDownloadingTs()
            let errorTsCount = self.m3u8Data.filterErrorTs()
            
            let mainWin = BrowserViewMgr.mainWin;
            let statusInfo = {
                browserView_webContents_Id:self.browserView_webContents_Id,
                normalTsCount:normalTsCount.length,
                finishTsCount:finishTsCount.length,
                downloadingTsCount:downloadingTsCount.length,
                errorTsCount:errorTsCount.length,
            };
            mainWin.webContents.send('download-m3u8-ts-summary',statusInfo);
            return statusInfo;
        }catch(err){
            
        }
    }
}

class FindM3u8Result{
    is_success:boolean;
    browserView_webContents_Id:number;
    url:string;
    segmentsLength:number;
    msg:string;

    constructor(){
         
    }
    success(browserView_webContents_Id:number,url:string,segmentsLength:number):void{
        this.is_success = true;
        this.msg = '';

        this.browserView_webContents_Id = browserView_webContents_Id;         
        this.url = url;
        this.segmentsLength = segmentsLength;
    }
    error(browserView_webContents_Id:number,url:string,msg:string):void{
        this.is_success = false;
        this.msg = msg;

        this.browserView_webContents_Id = browserView_webContents_Id;         
        this.url = url; 
    }
}