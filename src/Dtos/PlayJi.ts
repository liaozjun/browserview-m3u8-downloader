import {DownloadStatus} from '../Enums/DownloadStatus'
export class PlayJi{
    id:number
    player:string
    name:string
    url:string
    status:DownloadStatus
    gId:number
    groupName:string
    folder_name:string
    reportsProgress:string
    constructor(){
        this.id = 0
        this.player=''
        this.name=''
        this.url=''
        this.status = DownloadStatus.Normal_
        this.gId = 0
        this.groupName = ''
        this.folder_name= ''
        this.reportsProgress = ''
    }
    public title():string{
        return this.status == DownloadStatus.Normal_?'danger':'default'
    }
}