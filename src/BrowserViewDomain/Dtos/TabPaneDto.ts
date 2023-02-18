const _  = require('lodash');

export class TabPaneDto{
    title: string     
    tabKey: string
    closable?: boolean
    browserView_webContents_Id:number 
    url:string 
    downloadBtn:DownloadBtnViewModel
    isDownloadingM3u8:boolean
    constructor(title:string,key:string,browserView_webContents_Id:number,url:string,closable:boolean){
        this.title = title;
        
        this.tabKey = key;
        this.closable = closable;
        this.browserView_webContents_Id = browserView_webContents_Id;
        this.url = url;
        this.downloadBtn = new DownloadBtnViewModel();
        this.isDownloadingM3u8 = false;
    }
    public titleFormat():string{
        //let titleLen = this.title.toString().replace(/[\u0391-\uFFE5]/g,"aa").length;
        let shortName  = _.truncate(this.title,{
            'length': 15,
          })
        //return `${this.browserView_webContents_Id}_${shortName}`;
        return `${shortName}`;
    }
    public m3u8Downloading(){
        this.isDownloadingM3u8 = true
        this.downloadBtn.disabled = this.isDownloadingM3u8
        this.closable = !this.isDownloadingM3u8
    }
    public m3u8Complete(){
        this.isDownloadingM3u8 = false
        this.downloadBtn.disabled = this.isDownloadingM3u8
        this.closable = !this.isDownloadingM3u8
    }
    public hadFoundM3u8(url:string,segmentsLength:any):void{        
        this.downloadBtn.disabled = false;
        this.downloadBtn.text = `下载(${segmentsLength})`
        this.downloadBtn.type= 'primary';
    }
    public resetDownloadBtn(){
        this.downloadBtn.disabled = true;
        this.downloadBtn.text = `下载`
        this.downloadBtn.type= 'default';
    }
    // public finishM3u8HasError(msg:string){

    // }
    // public finishM3u8HasSuccess(msg:string){

    // }
}
class DownloadBtnViewModel{
    text:string;
    type:string;
    disabled:boolean;
    constructor(){
        this.text = '下载';
        this.type = 'dashed';
        this.disabled = true;
    }
    
}

