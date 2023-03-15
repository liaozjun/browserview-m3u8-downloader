import {Setting} from '../Dtos/Setting'
export class ModalSettingViewModel{
    visiable:boolean
    settingForm:Setting
    constructor(){
        this.visiable = false
        this.settingForm = new Setting()
        this.settingForm.requestTsCountPreM3u8 = 5
    }
}