export class PlayDataDto{
    /* {
      folder_name: '1132FEB41876400aBAA33FF0D8217C8E',
      id: 23,
      name: 'DemoDemoDemoDemo鍟婂晩鍙戝彂鏂拏鑺珼emoDemoDemoDemoDemoDemoDemoDemoDemoDemo',
      origin_url: 'https://v6.dious.cc/20220521/I9aC18I4/1500kb/hls/index.m3u8',
      status: 0
    } */
    id:number
    name:string
    folder_name:string
    origin_url:string
    status:number
    constructor(){
        this.id = 0
        this.name = ''
        this.folder_name = ''
        this.origin_url = ''
        this.status = 0
    }

    

}