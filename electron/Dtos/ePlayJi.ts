import { DownloadStatus } from "../Enums/DownloadStatus";
export class ePlayJi{
    id:number
    player:string
    name:string
    url:string
    status:DownloadStatus
    gId:number
    folder_name:string
    constructor(){
        this.id = 0
        this.player=''
        this.name=''
        this.url=''
        this.status = DownloadStatus.Normal_
        this.gId = 0
        this.folder_name= ''
    }
}