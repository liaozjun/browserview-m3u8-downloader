import _ from 'lodash'
import { ipcMain } from 'electron'
import * as fsPromise from 'node:fs/promises';
import {Setting} from '../Dtos/Setting'
export class PlayerView{
    static setting:Setting
    private _m3u8Service:any
    constructor(m3u8Service:any){
        this._m3u8Service = m3u8Service;
        PlayerView.setting = new Setting();        
    }
    async init():Promise<void>{
        let self = this;
        let val:Setting = await this.getSettingAsync();
        PlayerView.setting.requestTsCountPreM3u8 = val.requestTsCountPreM3u8;

        ipcMain.handle('getPlayList', async (event, args) => {
            //console.log('getPlayList args',args);
            return self.GetPlayList(args.pageIndex,args.pageSize)             
        })
        ipcMain.handle('save-setting',async (event,args:Setting)=>{
            //保存配置
            let path = `${process.resourcesPath}/setting.json`;
            PlayerView.setting.requestTsCountPreM3u8 = args.requestTsCountPreM3u8;
            await fsPromise.writeFile(path,JSON.stringify(args));                      
        })
        ipcMain.handle('get-setting',async(event,args)=>{           
            return PlayerView.setting;
        });
    }
    public async getSettingAsync(): Promise<Setting>{
        let path = `${process.resourcesPath}/setting.json`
        const contents = await fsPromise.readFile(path, { encoding: 'utf8' })
        let val:Setting = JSON.parse(contents)
        return val
    }
    GetPlayList(pageIndex: number, pageSize :number):any{
        return this._m3u8Service.GetAll(JSON.stringify({ pageIndex: pageIndex, pageSize :pageSize}))
    }
}