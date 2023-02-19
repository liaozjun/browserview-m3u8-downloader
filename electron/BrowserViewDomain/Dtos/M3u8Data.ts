import _ from 'lodash'
export class M3u8Data{
    
    manifest:any;
    id:number;
    folder_name:string;
    url:string;
    private status:DownloadStatus;
    private tsDownloadInfoList:Array<TsDownloadInfo>;
    constructor(){
        this.id= 0;
        this.manifest = null;
        this.url= '';

        this.tsDownloadInfoList = new Array<TsDownloadInfo>();
        this.status = DownloadStatus.Normal_;
    }
    dump():void{
        console.log('M3u8Data dump',this.url,this.manifest)
    }
    set(url:string,manifest:any):void{
        this.url = url;
        this.manifest = manifest;
    }
    setData(id:number,folder_name:string):void {
        this.id = id;
        this.folder_name = folder_name;
    }
    //load reload navigation reset
    reset():void{
        this.id = 0;
        this.manifest = null;
        this.url= '';
        
        this.status = DownloadStatus.Normal_;
        this.tsDownloadInfoList = new Array<TsDownloadInfo>();
    }
    findNormalTsFirstOrUndefined():TsDownloadInfo{
        return this.tsDownloadInfoList.find(ts=> ts.IsNormalStatus())
    }
    filterNormalTs():Array<TsDownloadInfo>{
        return _.filter(this.tsDownloadInfoList,ts=>ts.IsNormalStatus())
    }
    filterFinishTs():Array<TsDownloadInfo>{
        return _.filter(this.tsDownloadInfoList,ts=>ts.IsFinishStatus())
    }
    filterDownloadingTs():Array<TsDownloadInfo>{
        return _.filter(this.tsDownloadInfoList,ts=>ts.IsDownloadingStatus())
    }
    filterErrorTs():Array<TsDownloadInfo>{
        return _.filter(this.tsDownloadInfoList,ts=>ts.IsErrorStatus());
    }

    dumpM3u8Index():Array<string>{
        // {"duration":3,"uri":"/20220521/I9aC18I4/1500kb/hls/u6imffMg.ts","key":{"method":"AES-128","uri":"/20220521/I9aC18I4/1500kb/hls/key.key"},"timeline":0}
        let indexm3u8all: Array<string> = [];
        indexm3u8all.push('#EXTM3U')
        indexm3u8all.push(`#EXT-X-TARGETDURATION:${this.manifest.targetDuration}`)
        indexm3u8all.push('#EXT-X-ALLOW-CACHE:YES')
        indexm3u8all.push(`#EXT-X-PLAYLIST-TYPE:${this.manifest.playlistType}`)
        indexm3u8all.push(`#EXT-X-VERSION:${this.manifest.version}`)
        indexm3u8all.push(`#EXT-X-MEDIA-SEQUENCE:${this.manifest.mediaSequence}`)
        //#EXT-X-KEY:METHOD=AES-128,URI="/20220521/I9aC18I4/1500kb/hls/key.key"
        let fseg  = this.manifest.segments[0];
        if(_.hasIn(fseg,'key')){
            var lastof = fseg.key.uri.lastIndexOf("/");
            var splitwhy = fseg.key.uri.split("?");          
            var fileName = fseg.key.uri.substr(lastof + 1, splitwhy[0].length - lastof - 1);
            indexm3u8all.push(`#EXT-X-KEY:METHOD=${fseg.key.method},URI="${fileName}"`)
        }
        _.forEach(this.manifest.segments,seg=>{
            indexm3u8all.push(`#EXTINF:${seg.duration},`)
            var lastof = seg.uri.lastIndexOf("/");
            var splitwhy = seg.uri.split("?");          
            var fileName = seg.uri.substr(lastof + 1, splitwhy[0].length - lastof - 1);
            indexm3u8all.push(`${fileName}`)
        })
        indexm3u8all.push('#EXT-X-ENDLIST')
        return indexm3u8all
    }
    statusDownloading_():void{
        let self = this
        self.status = DownloadStatus.Downloading_
    }
    statusFinish_():void{
        let self =this
        self.status = DownloadStatus.Finish_
    }
    statusNormal_():void{
        let self =this
        self.status = DownloadStatus.Normal_
    }
    InitTsDownloadInfo():void{
        let self = this;
        let urlObj = new URL(self.url);
        var lastxg = self.url.lastIndexOf("/");
        var preurl = self.url.substring(0, lastxg + 1);       

        this.tsDownloadInfoList = new Array<TsDownloadInfo>();
        //如果有加密 生成key任务
        let fseg  = this.manifest.segments[0];
        if(_.hasIn(fseg,'key')){
            var lastof = fseg.key.uri.lastIndexOf("/");
            var splitwhy = fseg.key.uri.split("?");          
            var fileName = fseg.key.uri.substr(lastof + 1, splitwhy[0].length - lastof - 1);

            let keyfile:TsDownloadInfo  = new TsDownloadInfo()
            keyfile.fileName = fileName
            keyfile.status = DownloadStatus.Normal_
            if(_.startsWith(fseg.key.uri,'/')){
                keyfile.url = `${urlObj.origin}${fseg.key.uri}`
            }else{
                keyfile.url = `${preurl}${fseg.key.uri}`
            }
            self.tsDownloadInfoList.push(keyfile)
        }
        //生成ts 任务
        _.forEach(self.manifest.segments,seg=>{
            var lastof = seg.uri.lastIndexOf("/");
            var splitwhy = seg.uri.split("?");          
            var fileName = seg.uri.substr(lastof + 1, splitwhy[0].length - lastof - 1);

            let ts:TsDownloadInfo  = new TsDownloadInfo()
            ts.fileName = fileName
            ts.status = DownloadStatus.Normal_
            
            if(_.startsWith(seg.uri,'/')){//绝对路径              
                ts.url = `${urlObj.origin}${seg.uri}`
            }else{//相对路径
                ts.url = `${preurl}${seg.uri}`
            }
            self.tsDownloadInfoList.push(ts)
        })
    }
    resetErrorTsForDownload():void{
        let errTs = _.filter(this.tsDownloadInfoList,ts=>ts.IsErrorStatus())
        _.forEach(errTs,(ts:TsDownloadInfo)=>{
            ts.status = DownloadStatus.Normal_
        })
    }
}

class TsDownloadInfo{
    url:string;
    fileName:string;
    status:DownloadStatus;
    msg:string;
    constructor(){
        this.url = '';
        this.status = DownloadStatus.Normal_;
        this.msg = '';
    }
    IsNormalStatus():boolean{
        return this.status == DownloadStatus.Normal_;
    }
    IsFinishStatus():boolean{
        return this.status == DownloadStatus.Finish_;
    }
    IsDownloadingStatus():boolean{
        return this.status == DownloadStatus.Downloading_;
    }
    IsErrorStatus():boolean{
        return this.status == DownloadStatus.Error_;
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
enum DownloadStatus {
    Normal_ = 0,
    Finish_,
    Downloading_,
    Error_
}