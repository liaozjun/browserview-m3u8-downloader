import { ipcRenderer } from 'electron'
import {PlayJi} from './Dtos/PlayJi'
import {PlayJiGroup} from './Dtos/PlayJiGroup'
import {DownloadStatus} from './Enums/DownloadStatus'
var moment = require('moment');

export class Utils{
    static async GetGuid():Promise<string>{
        let guid:string = await ipcRenderer.invoke('GetGuid',null)
        return guid;
    }

    static async InsertPlayJiGroupDefault():Promise<PlayJiGroup>{
        let seq = moment().format("YYYYMMDDHHmmss");
        return await Utils.InsertPlayJiGroup(`code${seq}`,`分组${seq}`)        
    }

    static async InsertPlayJiGroup(code:string,name:string):Promise<PlayJiGroup>{
        let sql:string = `INSERT INTO "PlayJiGroup" ( "pId", "code", "name") VALUES ( 0, '${code}', '${name}');`
        let ret = await ipcRenderer.invoke('ExecuteNonQueryRetrunId',{sql:sql})
        let g = new PlayJiGroup
        g.id= ret.id
        g.code = code
        g.name = name
        return g;
    }
    static async GetPlayJiGroupList():Promise<Array<PlayJiGroup>>{
        let sql:string = `select * from PlayJiGroup order by id desc;`
        let ret = await ipcRenderer.invoke('ExecuteReader',{sql:sql})
        return ret
    }
    static async UpdatePlayJiGroup(pjGroup:PlayJiGroup):Promise<PlayJiGroup>{
        let sql:string = `update PlayJiGroup set name = '${pjGroup.name}' where id = ${pjGroup.id};`
        return await ipcRenderer.invoke('ExecuteNonQuery',{sql:sql})
    }
    static async DeletePlayJiGroup(pjGroupId:number):Promise<number>{
        let sql:string = `delete from PlayJiGroup where id = ${pjGroupId};`
        return await ipcRenderer.invoke('ExecuteNonQuery',{sql:sql})
    }
    //PlayJi/////////////////////////////////////////
    static async InsertPlayJi(playJi:PlayJi):Promise<PlayJi>{
        let sql:string = `INSERT INTO "main"."PlayJi" ("player", "name", "url", "status", "gId", "folder_name") 
            VALUES ('${playJi.player}', '${playJi.name}', '${playJi.url}', ${playJi.status}, ${playJi.gId}, '${playJi.folder_name}');`
            
        let ret = await ipcRenderer.invoke('ExecuteNonQueryRetrunId',{sql:sql})
        playJi.id = ret.id
        return playJi
    }
    static async GetPlayJiList(playJiGroupId:number):Promise<Array<PlayJi>>{
        let sql:string = `select * from PlayJi where gId=${playJiGroupId}`
        let ret = await ipcRenderer.invoke('ExecuteReader',{sql:sql})
        return ret 
    }
    static async UpdatePlayJi(pj:PlayJi):Promise<PlayJi>{
        let sql:string = `update PlayJi set name = '${pj.name}' where id = ${pj.id};`
        return await ipcRenderer.invoke('ExecuteNonQuery',{sql:sql})
    }
    static async UpdatePlayJiStatus(playJiId:number,status:DownloadStatus):Promise<PlayJi>{
        let sql:string = `update PlayJi set status = ${status} where id = ${playJiId};`
        return await ipcRenderer.invoke('ExecuteNonQuery',{sql:sql})
    }
    static async DeletePlayJi(playJiId:number):Promise<number>{
        let sql:string = `delete from PlayJi where id = ${playJiId} ;`
        return await ipcRenderer.invoke('ExecuteNonQuery',{sql:sql})
    }
}