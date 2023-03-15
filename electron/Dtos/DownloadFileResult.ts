export class DownloadFileResult{
    is_success:boolean;
    msg:string;
    blob:Buffer;
    constructor(is_success:boolean,msg:string){
        this.is_success = is_success;
        this.msg = msg;
        this.blob = null;
    }
}