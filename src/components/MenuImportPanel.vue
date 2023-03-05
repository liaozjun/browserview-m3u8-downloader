<template>
    <div>
        <a-space size="0">
            <a-button type="Default" :loading="importBtn.loading" size="small"  @click="onClickImport">{{importBtn.txt}}</a-button>
             <!-- <a-button size="small" @click="testClick">Default</a-button> -->
            <!--<a-button type="Default" size="small">Dashed</a-button>
            <a-button type="Default" size="small">Link</a-button> -->
        </a-space>
    </div>
    <a-menu v-model:selectedKeys="selectedPlayData" style="height:calc(100vh - 46px - 40px - 36px - 24px);background: white;overflow: auto;overflow-y:auto;" mode="inline">
        <a-sub-menu v-for="pjGroup in playJiGroupList" :key="`import:${pjGroup.id}`"  @titleClick="titleClick(pjGroup)">
            <template #icon>
            <AppstoreOutlined />
            </template>
            <template #title>
                <a-dropdown :trigger="['contextmenu']">
                    <div>{{pjGroup.name}}</div>
                    <template #overlay>
                        <a-menu>
                            <a-menu-item :key="`import:${pjGroup.id}:edit`" @click="onClickGroupEdit(pjGroup)">分组编辑</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:delete`" >分组删除</a-menu-item>
                        </a-menu>
                    </template>
                </a-dropdown>
            </template>
            <a-menu-item v-for="pj in pjGroup.playJiList" :key="`import:${pjGroup.id}:${pj.id}`" @click="onPlayDataClick(pj)"
                style="width: calc(100%);">
                <a-dropdown :trigger="['contextmenu']">
                    <div>
                        <a-typography-text :type="playJiTitle(pj)">{{ pj.name }}</a-typography-text>
                        <a-typography-text style="margin-left:50px;" type="secondary">{{pj.reportsProgress}}</a-typography-text>
                    </div> 
                    <template #overlay>
                        <a-menu>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:download`" @click="onClickDownload(pj)">下载</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:edit`" @click="onClickEdit(pj)">编辑</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:delete`" >删除</a-menu-item>
                        </a-menu>
                    </template>
                </a-dropdown>
            </a-menu-item>
        </a-sub-menu>      
    </a-menu>
    <a-modal v-model:visible="defaultEditViewModel.visiable" :title="`编辑( )`"  :footer="null">
        <a-form 
            :model="defaultEditViewModel"                
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            autocomplete="off"
            @finish="onFinish"
            @finishFailed="onFinishFailed"
        >
            <a-form-item label="名称" name="名称" >
                <a-input v-model:value="defaultEditViewModel.formState.name" :min="1" :max="10" />
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
            <a-button type="primary" html-type="submit">保存</a-button>
            </a-form-item>
        </a-form>
       
    </a-modal>
</template>

<script lang="ts">
    import { defineComponent,ref,reactive,onMounted,toRaw } from 'vue'
    import { AppstoreOutlined} from '@ant-design/icons-vue'
    import { ipcRenderer } from 'electron'
    import {PlayJi} from '../Dtos/PlayJi'
    import { message } from 'ant-design-vue'
    import { Utils } from '../Utils'
    import { PlayJiGroup } from '../Dtos/PlayJiGroup'
import { DownloadStatus } from '../Enums/DownloadStatus'
    var moment = require('moment');
   
    const _ = require('lodash')
    export default defineComponent({
        name: 'MenuImportPanel',        
        props: {
            title:{
                type:String
            },
            onPlayData:{
                type:Function,
                require:true,
            }
        },
        components:{
            AppstoreOutlined
        },
        setup(props){
            onMounted(async  function(){
                let ret:Array<PlayJiGroup> = await Utils.GetPlayJiGroupList();
                _.forEach(ret,(item:PlayJiGroup)=>{
                    let pjGroup:PlayJiGroup = new PlayJiGroup()
                    pjGroup.id = item.id
                    pjGroup.code = item.code
                    pjGroup.name = item.name
                    pjGroup.pId = item.pId
                    playJiGroupList.value.push(pjGroup)
                })
                ipcRenderer.on('_WorkerReportsBeforeProgress',(event,args:{
                    PlayJigId: number,
                    PlayJiId: number,
                    success:boolean,
                    message:string
                })=>{
                    let group:PlayJiGroup = _.find(playJiGroupList.value,(g:PlayJiGroup)=>g.id==args.PlayJigId)
                    if(group != undefined){
                        let ji:PlayJi = _.find(group.playJiList,(ji:PlayJi)=>ji.id == args.PlayJiId)
                        if(ji != undefined){
                            ji.reportsProgress = args.message
                        }
                    }
                })
                ipcRenderer.on('_WorkerReportsProgress',(event,args:{PlayJigId: number,
                    PlayJiId: number,
                    tsCount: number,
                    normalTsCount:number,
                    finishTsCount:number,
                    downloadingTsCount:number,
                    errorTsCount:number})=>{
                    // console.log(args)
                    let group:PlayJiGroup = _.find(playJiGroupList.value,(g:PlayJiGroup)=>g.id==args.PlayJigId)
                    if(group != undefined){
                        let ji:PlayJi = _.find(group.playJiList,(ji:PlayJi)=>ji.id == args.PlayJiId)
                        if(ji != undefined){
                            ji.reportsProgress = `完成:${args.finishTsCount},下载:${args.downloadingTsCount},错误:${args.errorTsCount},共:${args.tsCount}`

                            if(args.normalTsCount == 0 && args.downloadingTsCount == 0){
                                let statusTmp:DownloadStatus = DownloadStatus.Finish_
                                if(args.errorTsCount != 0 ){
                                    statusTmp = DownloadStatus.Error_
                                    ji.reportsProgress = `完成:${args.finishTsCount},下载:${args.downloadingTsCount},错误:${args.errorTsCount},共:${args.tsCount},(右键下载错误Ts)`
                                }
                                Utils.UpdatePlayJiStatus(ji.id, statusTmp)
                                ji.status = statusTmp
                            }
                        }
                        
                    }
                })
            })
            const importBtn = reactive<ImportBtn>(new ImportBtn())
            const playJiGroupList = ref<PlayJiGroup[]>([])
            const defaultEditViewModel = reactive<DefaultEditViewModel>(new DefaultEditViewModel())

            const handleOk = ()=>{
                
            }
            const onClickImport = async()=>{
                try{
                    importBtn.import()
                    //带出名字
                    let ret:{basename:string,playList:Array<PlayJi>} = await ipcRenderer.invoke('showOpenDialog',null)
                    let seq = moment().format("YYYYMMDDHHmmss")
                    let basename = ret.basename.split('.')[0]
                    let playJiGroup:PlayJiGroup = await Utils.InsertPlayJiGroup(`${basename}_${seq}`,basename)
                    await Promise.all(ret.playList.map( async item => {                        
                        let playJi = new PlayJi();
                        playJi.gId = playJiGroup.id
                        playJi.name = item.name
                        playJi.player = item.player
                        playJi.url = item.url
                        playJi.folder_name = await Utils.GetGuid()
                        await Utils.InsertPlayJi(playJi)
                        playJiGroup.playJiList.push(playJi)
                    }))
                    playJiGroupList.value.push(playJiGroup)
                    playJiGroupList.value = _.orderBy(playJiGroupList.value, ['id'], ['desc'])
                }catch(err){
                    message.error(JSON.stringify(err))
                    
                }finally{
                    importBtn.importEnd();
                }
            }
            const testClick = async ()=>{               
                //playJiList.value[0].name = '11231'
            }
            const titleClick = async (pjGroup: PlayJiGroup) => {
                if(pjGroup.playJiList.length == 0){
                    let ret:Array<PlayJi>  = await Utils.GetPlayJiList(pjGroup.id)
                    _.forEach(ret,(pj:PlayJi)=>{pjGroup.playJiList.push(pj)})
                }
            };
            const onPlayDataClick = (playJi:PlayJi) =>{
                if(props.onPlayData){
                    let url = ''
                    if(playJi.status == DownloadStatus.Finish_ || playJi.status == DownloadStatus.Error_){
                        url = `http://localhost:9001/${playJi.folder_name}/index.m3u8`
                    }else{
                        url = playJi.url
                    }
                    props.onPlayData(url)
                }
            }
            const onClickGroupEdit = (pjGroup:PlayJiGroup)=>{
                defaultEditViewModel.type = DefaultEditViewModel.TypeGroup
                defaultEditViewModel.formState = pjGroup
                defaultEditViewModel.visiable = true
            }
            const onClickEdit = (pj:PlayJi)=>{
                defaultEditViewModel.type = DefaultEditViewModel.TypePlayJi
                defaultEditViewModel.formState = pj
                defaultEditViewModel.visiable = true
            }
            const onFinish = async (values: any) => {            
                try{
                    if(defaultEditViewModel.type == DefaultEditViewModel.TypeGroup){                        
                       let ret = await Utils.UpdatePlayJiGroup(defaultEditViewModel.formState)
                    }
                    if(defaultEditViewModel.type == DefaultEditViewModel.TypePlayJi){
                        let ret = await Utils.UpdatePlayJi(defaultEditViewModel.formState)
                    }
                    defaultEditViewModel.visiable = false
                 
                    message.success('保存成功')               
                }catch(err:any){
                    message.error(err.message)
                }
            };

            const onFinishFailed = (errorInfo: any) => {
            }
            const onClickDownload = async (pj:PlayJi) =>{                
                ipcRenderer.send('DownloadM3u8FormImport',toRaw(pj))
                console.log('onClickDownload')
            }
            const playJiTitle = (pj:PlayJi):string=>{
                if(pj.status == DownloadStatus.Normal_){
                    return 'warning'
                }
                if(pj.status == DownloadStatus.Error_){
                    return 'danger'
                }
                if(pj.status == DownloadStatus.Finish_){
                    return 'success'
                }
                return 'default'
            }
            return {
                playJiTitle,
                onFinish,
                onFinishFailed,
                importBtn,
                playJiGroupList,
                 
                titleClick,

                handleOk,
                onClickImport,
                selectedPlayData: ref<string[]>([]),
                testClick,
                onPlayDataClick,
                defaultEditViewModel,

                onClickGroupEdit,
                onClickEdit,
                onClickDownload,
            };
        },
    });
    class ImportBtn{
        loading:boolean
        txt:string
        constructor(){
            this.loading=false
            this.txt='导入'
        }
        import(){
            this.loading = true
            this.txt = '导入中...'
        }
        importEnd(){
            this.loading = false
            this.txt = '导入'
        }
    }
    class DefaultEditViewModel{
        static readonly TypeGroup:number = 1
        static readonly TypePlayJi:number = 2
        visiable:boolean
        formState:any
        type:number
        constructor(){
            this.visiable = false
            this.formState = ''
            this.type = DefaultEditViewModel.TypeGroup
        }
    }
</script>