import _ from 'lodash'
export class Utils{
    public static DumpM3u8Index(manifest:any):string{
        let indexm3u8all: Array<string> = [];
        indexm3u8all.push('#EXTM3U')
        indexm3u8all.push(`#EXT-X-TARGETDURATION:${manifest.targetDuration}`)
        indexm3u8all.push('#EXT-X-ALLOW-CACHE:YES')
        indexm3u8all.push(`#EXT-X-PLAYLIST-TYPE:${manifest.playlistType}`)
        indexm3u8all.push(`#EXT-X-VERSION:${manifest.version}`)
        indexm3u8all.push(`#EXT-X-MEDIA-SEQUENCE:${manifest.mediaSequence}`)
        //#EXT-X-KEY:METHOD=AES-128,URI="/20220521/I9aC18I4/1500kb/hls/key.key"
        let fseg  = manifest.segments[0];
        if(_.hasIn(fseg,'key')){             
            var fileName = Utils.GetFileName(fseg.key.uri)// fseg.key.uri.substr(lastof + 1, splitwhy[0].length - lastof - 1);
            indexm3u8all.push(`#EXT-X-KEY:METHOD=${fseg.key.method},URI="${fileName}"`)
        }
        _.forEach(manifest.segments,seg=>{
            indexm3u8all.push(`#EXTINF:${seg.duration},`)
            var fileName = Utils.GetFileName(seg.uri)
            indexm3u8all.push(`${fileName}`)
        })
        indexm3u8all.push('#EXT-X-ENDLIST')
        return indexm3u8all.join("\r\n")
    }
    public static GetFileName(uri:any):string{
        var lastof = uri.lastIndexOf("/");
        var splitwhy = uri.split("?")
        var fileName = uri.substr(lastof + 1, splitwhy[0].length - lastof - 1)
        return fileName
    }
}