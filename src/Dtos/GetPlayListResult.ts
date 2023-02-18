import {PlayDataDto} from './PlayDataDto'
export class GetPlayListResult{
    /*{"datas":[{"folder_name":"1132FEB41876400aBAA33FF0D8217C8E","id":23,
    "name":"DemoDemoDemoDemo啊啊发发斯蒂芬DemoDemoDemoDemoDemoDemoDemoDemoDemoDemo",
    "origin_url":"https://v6.dious.cc/20220521/I9aC18I4/1500kb/hls/index.m3u8","status":0}],
    "pageIndex":1,"pageSize":20,"totalCount":1}*/
    pageIndex:number;
    pageSize:number;
    totalCount:number;
    datas:Array<PlayDataDto>;
    constructor(){
        this.pageIndex = 0;
        this.pageSize = 0;
        this.totalCount = 0;
        this.datas = [];
    }
}