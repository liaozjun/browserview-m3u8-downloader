import {PlayDataDto} from '../Dtos/PlayDataDto'
export class PlayDataEditViewModel{
    visiable:boolean
    playDataDto:PlayDataDto
    constructor(){
        this.visiable = false
        this.playDataDto = new PlayDataDto()
    }
}