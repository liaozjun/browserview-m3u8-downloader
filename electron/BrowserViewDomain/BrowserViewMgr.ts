import {BrowserWindow, ipcMain } from 'electron'
import {BrowserViewDto} from "./Dtos/BrowserViewDto"

import _ from 'lodash'

export class BrowserViewMgr {
    static mainWin:BrowserWindow;
    private _browserViewDtoList:Array<BrowserViewDto>;
    private _m3u8ServiceAddon:any;
    constructor(m3u8Service:any) { 
        this._browserViewDtoList = new Array<BrowserViewDto>();
        this._m3u8ServiceAddon = m3u8Service;
    }
    init():void{
        let self = this;
        
        BrowserViewMgr.mainWin.webContents.session.webRequest.onCompleted(details=>{            
            if(details.webContentsId == undefined){
                return ;
            }
            let lurl:string = _.toLower(details.url);
            let pos = lurl.indexOf('.m3u8');
            if(pos != -1){
                let bviewDto = self._browserViewDtoList.find(view =>view.browserView_webContents_Id == details.webContentsId)
                if(bviewDto != null){                    
                    bviewDto._downloadM3u8Index(details.url);
                }else{
                    //throw new Error('webRequest.onCompleted not find browserview')
                }
            }
        });
            
        ipcMain.handle('add-browserview', async (event, args) => {
            //console.log('add-browserview args',args);            
            let dto:BrowserViewDto = new BrowserViewDto();
            dto.createBrowserView(args);
            self._browserViewDtoList.push(dto);
            
            return dto.getData();
        });
        ipcMain.handle('remove-browserview',async (event,args)=>{
            let bview = self._browserViewDtoList.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id);
            if(bview != undefined){
                _.remove(self._browserViewDtoList,item=>item.browserView_webContents_Id == args.browserView_webContents_Id);
                BrowserViewMgr.mainWin.removeBrowserView(bview.getBrowserView());
                return args;
            }
            return null;
        });
        ipcMain.handle('browserview_navigation',async(event,args)=>{
            //console.log('browserview_navigation',args);

            let bview = self._browserViewDtoList.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id);
            if(bview != undefined){
                bview.resetM3u8Data();
                
                if(args.action === 'navigation'){                    
                    bview.loadURL(args.url);
                }
                if(args.action === 'goBack'){
                    bview.goBack()
                }
                if(args.action === 'goForward'){
                    bview.goForward();
                }
                if(args.action === 'reload'){
                    bview.reload();
                }
            }
            return `browserview_navigation ${args.action}`;
        });
        ipcMain.handle('tabChange',async(event,args)=>{
            if(args.browserView_webContents_Id === -1){
                BrowserViewMgr.mainWin.setBrowserView(null);
            }else{
                let bview = self._browserViewDtoList.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id);
                BrowserViewMgr.mainWin.setBrowserView(bview.getBrowserView());
            }
            return 'tabChange ok';
        });
        
        ipcMain.handle('download-m3u8',async(event,args)=>{            
            let bview = self._browserViewDtoList.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id);
            if(bview == undefined){
                throw 'not found browserViewDto'
            }
            let errTs = bview.m3u8Data.filterErrorTs();
            if(errTs.length == 0){
                //有错误ts 重新载 
                let indexm3u8all =  bview.m3u8Data.dumpM3u8Index()         
                let insertOrUpdateM3u8DataInput ={
                    name: args.title, 
                    origin_url: bview.m3u8Data.url, 
                    status: 0,
                    indexm3u8all:indexm3u8all.join("\r\n"),
                }
                //下载m3u8 保存到sqlite
                let result = self._m3u8ServiceAddon.InsertOrUpdateM3u8Data(JSON.stringify(insertOrUpdateM3u8DataInput));
                if(result.effRow <= 0){
                    throw `InsertOrUpdateM3u8Data effRow <= 0: ${result.msg}`
                }
                //设置addon返回的数据
                bview.m3u8Data.setData(result.data.id,result.data.folder_name)
                //初始化 要下载的url
                bview.m3u8Data.InitTsDownloadInfo()
                bview.m3u8Data.statusNormal_();
                //开始下载
                bview.fakeThreadStart()
            }else{
                ///
                bview.m3u8Data.statusNormal_()
                bview.m3u8Data.resetErrorTsForDownload()                
                //开始下载
                bview.fakeThreadStart()
            }
            bview.downloadM3u8()
        });
         
    }
}