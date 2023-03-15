import { PlayJi } from "./PlayJi"

export class PlayJiGroup{
    id:number
    pId:number
    code:string
    name:string
    playJiList:Array<PlayJi>
    constructor(){
        this.id = 0
        this.pId = 0
        this.code = ''
        this.name = ''
        this.playJiList = []
    }
}