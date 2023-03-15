export class combine_ts_mp4_reply{
    playJiId:number
    playJiGroupId:number
    isEnd:boolean
    isError:boolean
    message:string
    openDir:string
    constructor(){
        this.playJiId = 0
        this.playJiGroupId = 0
        this.isEnd = true
        this.isError = false
        this.message = ''
        this.openDir = ''
    }
}