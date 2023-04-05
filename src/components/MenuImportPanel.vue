<template>
    <div>
        <!-- <a-space size="0"> -->
            <!-- <a-button type="Default" block :loading="importBtn.loading" size="small"  @click="onClickImport">{{importBtn.txt}}</a-button> -->
             <!-- <a-button size="small" @click="testClick">Default</a-button> -->
            <!--<a-button type="Default" size="small">Dashed</a-button>
            <a-button type="Default" size="small">Link</a-button> -->
        <!-- </a-space> -->
    </div>
    <a-menu v-model:selectedKeys="selectedPlayData" 
        style="height:calc(100vh - 46px - 40px - 36px - 24px);background: white;overflow: auto;overflow-y:auto;"
        mode="inline"
    >
        <a-sub-menu style="width:calc(99%);" v-for="pjGroup in playJiGroupList" :key="`import:${pjGroup.id}`"  @titleClick="titleClick(pjGroup)">
            <template #icon>
                <AppstoreOutlined />
            </template>
            <template #title>
                <a-dropdown :trigger="['contextmenu']">
                    <div>{{pjGroup.name}}</div>
                    <template #overlay>
                        <a-menu>                          
                            <a-menu-item-group title="分组">
                                <a-menu-item :key="`import:${pjGroup.id}:edit`" @click="onClickGroupEdit(pjGroup)">编辑</a-menu-item>
                                <a-menu-item :key="`import:${pjGroup.id}:delete`" @click="onClickGroupDelete(pjGroup)">删除</a-menu-item>
                            </a-menu-item-group>
                          
                        </a-menu>
                    </template>
                </a-dropdown>
            </template>
            <a-menu-item  v-for="pj in pjGroup.playJiList" :key="`import:${pjGroup.id}:${pj.id}`" @click="onPlayDataClick(pj)"
                style="width: calc(100%); padding:0px;margin:0px;line-height:34px;height:34px;">
                <a-dropdown :trigger="['contextmenu']">
                    <div>
                        <a-button type="dashed" block>{{pj.name}}</a-button>
                        <!-- <a-typography-text :type="playJiTitle(pj)">{{ pj.name }}</a-typography-text>
                        <a-typography-text style="margin-left:10px;"  type="secondary">{{pj.reportsProgress}}</a-typography-text> -->
                    </div> 
                    <template #overlay>
                        <a-menu>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:download`" @click="onClickDownload(pj)">下载</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:cancel`" @click="onClickCancel(pj)">取消下载</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:edit`" @click="onClickEdit(pj)">编辑</a-menu-item>
                            <a-menu-item :key="`import:${pjGroup.id}:${pj.id}:delete`" @click="onClickDelete(pj)">删除</a-menu-item>
                            <a-menu-item :disabled="ComputedCombineTsMenuItemDisabled(pj)" :key="`import:${pjGroup.id}:${pj.id}:combine_ts`" @click="onClickCombineTs(pj)">合拼mp4</a-menu-item>
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
    import { defineComponent,ref,reactive,onMounted,toRaw,createVNode } from 'vue'
    import { AppstoreOutlined,ExclamationCircleOutlined} from '@ant-design/icons-vue'
    import { ipcRenderer } from 'electron'
    import {PlayJi} from '../Dtos/PlayJi'
    import { message,Modal } from 'ant-design-vue'
    import { Utils } from '../Utils'
    import { PlayJiGroup } from '../Dtos/PlayJiGroup'
    import { DownloadStatus } from '../Enums/DownloadStatus'
    import {combine_ts_mp4_reply} from '../Dtos/combine_ts_mp4_reply'
    import Emitter from '../Mitt'
    var moment = require('moment')
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
            },
            playJiGroupList:{
                type:Array<PlayJiGroup>,
                require:true
            }
        },
        components:{
            AppstoreOutlined
        },
        setup(props){
            const importBtn = reactive<ImportBtn>(new ImportBtn()) 
            const defaultEditViewModel = reactive<DefaultEditViewModel>(new DefaultEditViewModel())

            onMounted(async  function(){
                
                ipcRenderer.on('_WorkerReportsBeforeProgress',(event,args:{
                    PlayJigId: number,
                    PlayJiId: number,
                    success:boolean,
                    message:string
                })=>{
                    // let group:PlayJiGroup = _.find(playJiGroupList.value,(g:PlayJiGroup)=>g.id==args.PlayJigId)
                    // if(group != undefined){
                    //     let ji:PlayJi = _.find(group.playJiList,(ji:PlayJi)=>ji.id == args.PlayJiId)
                    //     if(ji != undefined){
                    //         ji.reportsProgress = args.message
                    //     }
                    // }
                })
                ipcRenderer.on('_WorkerReportsProgress',(event,args:{PlayJigId: number,
                    PlayJiId: number,
                    tsCount: number,
                    normalTsCount:number,
                    finishTsCount:number,
                    downloadingTsCount:number,
                    errorTsCount:number})=>{
                    // console.log(args)
                    // let group:PlayJiGroup = _.find(playJiGroupList.value,(g:PlayJiGroup)=>g.id==args.PlayJigId)
                    // if(group != undefined){
                    //     let ji:PlayJi = _.find(group.playJiList,(ji:PlayJi)=>ji.id == args.PlayJiId)
                    //     if(ji != undefined){
                    //         ji.reportsProgress = `完成:${args.finishTsCount},下载:${args.downloadingTsCount},错误:${args.errorTsCount},共:${args.tsCount}`

                    //         if(args.normalTsCount == 0 && args.downloadingTsCount == 0){
                    //             let statusTmp:DownloadStatus = DownloadStatus.Finish_
                    //             if(args.errorTsCount != 0 ){
                    //                 statusTmp = DownloadStatus.Error_
                    //                 ji.reportsProgress = `完成:${args.finishTsCount},下载:${args.downloadingTsCount},错误:${args.errorTsCount},共:${args.tsCount},(右键下载错误Ts)`
                    //             }
                    //             Utils.UpdatePlayJiStatus(ji.id, statusTmp)
                    //             ji.status = statusTmp
                    //         }
                    //     }
                        
                    // }
                })
                ipcRenderer.on('combine_ts_mp4_reply',(event,args:combine_ts_mp4_reply)=>{
                    // let group:PlayJiGroup = _.find(playJiGroupList.value,(g:PlayJiGroup)=>g.id == args.playJiGroupId)
                    // if(group != undefined){
                    //     let ji:PlayJi = _.find(group.playJiList,(ji:PlayJi)=>ji.id == args.playJiId)
                    //     if(ji != undefined){
                    //         if(args.isEnd){
                    //             ji.reportsProgress = '转换结束'
                    //             if(args.isError){
                    //                 ji.reportsProgress = args.message
                    //             }
                    //         }else{
                    //             ji.reportsProgress = '转换中'
                    //         }
                    //     }
                    // }
                    // if(args.isEnd && !_.isEmpty(args.openDir)){
                    //     //fs.opendirSync(args.openDir)
                    //     //这里测试
                    //     ipcRenderer.invoke('openDir',args.openDir)
                    // }
                })
            })
            
            const handleOk = ()=>{ 
            }
             
            const testClick = async ()=>{ 
                Emitter.emit('foo',"fooooooo")
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
            const onClickGroupDelete = async (pjGroup:PlayJiGroup)=>{
                let playJiList:Array<PlayJi>  = await Utils.GetPlayJiList(pjGroup.id)
                let childInfo:string = ''
                if(playJiList.length>0){
                    childInfo = `分组下有${playJiList.length}个视频,`;
                }
                Modal.confirm({
                    title: `注意删除分组(${pjGroup.id})`,
                    icon: createVNode(ExclamationCircleOutlined),
                    content: createVNode('div', { style: 'color:red;' }, `${childInfo}是否删除,(${pjGroup.name})`),
                    okText:'确定',
                    cancelText:'取消',
                    async onOk() {
                        for(let pjIndex in playJiList){
                            let pj:PlayJi = playJiList[pjIndex];
                            await ipcRenderer.invoke('DeleteDir',{folder_name: pj.folder_name})
                            let ret = await Utils.DeletePlayJi(pj.id)
                            if(ret <= 0){
                                message.success(`删除'${pj.name}'错误,请重试!`,10);
                                return ;
                            }
                        }
                        let effrow = await Utils.DeletePlayJiGroup(pjGroup.id);
                        if(effrow > 0){
                           _.remove(props.playJiGroupList,(g:PlayJiGroup)=>g.id == pjGroup.id)
                            message.success('删除成功');
                        }
                    },
                    onCancel() {
                        console.log('Cancel');
                    },
                    
                });
            }
            const onClickEdit = (pj:PlayJi)=>{
                defaultEditViewModel.type = DefaultEditViewModel.TypePlayJi
                defaultEditViewModel.formState = pj
                defaultEditViewModel.visiable = true
            }
            const onClickDelete = (pj:PlayJi)=>{                
                Modal.confirm({
                    title: `注意(${pj.id})`,
                    icon: createVNode(ExclamationCircleOutlined),
                    content: createVNode('div', { style: 'color:red;' }, `是否删除,(${pj.name})`),
                    okText:'确定',
                    cancelText:'取消',
                    async onOk() {
                        await ipcRenderer.invoke('DeleteDir',{folder_name:pj.folder_name})
                        let ret = await Utils.DeletePlayJi(pj.id)
                        if(ret >0){
                            let group:PlayJiGroup = _.find(props.playJiGroupList,(g:PlayJiGroup)=>g.id==pj.gId);
                            if(group != undefined){
                                _.remove(group.playJiList,(p:PlayJi)=>p.id == pj.id)
                                message.success('删除成功');
                            }
                        }
                    },
                    onCancel() {
                        console.log('Cancel');
                    },
                    
                });
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
            }
            const onFinishFailed = (errorInfo: any) => {
            }
            const onClickCancel = async (pj:PlayJi)=>{
                ipcRenderer.send('CancelM3u8FormImport',toRaw(pj))
                console.log('onClickDownload')
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
            const onClickCombineTs = (pj:PlayJi)=>{
                let group = _.find(props.playJiGroupList,(g:PlayJiGroup) => g.id == pj.gId);
                if(group != undefined){
                    let pjTmp = toRaw(pj)
                    pjTmp.groupName = group.name;
                    ipcRenderer.invoke('combine_ts_mp4',pjTmp)
                }
            }
            const ComputedCombineTsMenuItemDisabled = (pj:PlayJi)=>{
                return pj.status != DownloadStatus.Finish_
            }
            return {
                playJiTitle,
                onFinish,
                onFinishFailed,
                importBtn, 
                 
                titleClick,

                handleOk, 
                selectedPlayData: ref<string[]>([]),
                testClick,
                onPlayDataClick,
                defaultEditViewModel,

                onClickGroupEdit,
                onClickGroupDelete,
                onClickEdit,
                onClickDownload,
                onClickCancel,
                onClickDelete,

                onClickCombineTs,
                ComputedCombineTsMenuItemDisabled,
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