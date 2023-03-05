<template>
    <div>
        <a-menu v-model:selectedKeys="topMenuCurrent" mode="horizontal" :disabled="activeKey !== '1'">
            <a-menu-item key="drawer" @click="() => (layoutSiderCollapsed = !layoutSiderCollapsed)" >
                <menu-unfold-outlined v-if="layoutSiderCollapsed" class="trigger" />
                <menu-fold-outlined v-else class="trigger" />
                抽屉
            </a-menu-item>
            <a-sub-menu key="tool">
                <template #icon>
                    <tool-outlined />
                </template>
                <template #title>工具</template>
                <a-menu-item-group title="转换">
                    <a-menu-item key="tool:1" disabled>MP4</a-menu-item>
                    <!-- <a-menu-item key="setting:2">Option 2</a-menu-item> -->
                </a-menu-item-group>
            </a-sub-menu>
            <a-menu-item key="setting" @click="onClickModelSetting">
                <template #icon>
                    <setting-outlined />
                </template>
                设置
            </a-menu-item>            
        </a-menu>

        <a-tabs size="large" v-model:activeKey="activeKey" type="editable-card" @edit="onEdit" @change="onChange" :tabBarStyle="{margin:0}">
            <template v-for="pane in panes" :key="pane.tabKey">
                <a-tab-pane  v-if="pane.tabKey === '1'" :key="pane.tabKey" :tab="pane.title" :closable="pane.closable">
                    <a-layout style="height:calc(100vh - 46px - 40px)">
                        <a-layout-sider v-model:collapsed="layoutSiderCollapsed" collapsedWidth="0" style="background: white;" width="30%">
                            <a-tabs v-model:activeKey="menuTabActiveKey" :tabBarStyle="{margin:'0px'}" size="small" type="card">
                                <a-tab-pane key="pane:download" tab="下载">
                                    <a-space size="0">
                                        <a-button type="Default" size="small" @click="onClickRefresh">刷新</a-button>
                                        <!-- <a-button size="small">新建分组</a-button> -->
                                    </a-space>
                                    <a-menu v-model:selectedKeys="selectedPlayData" style="height:calc(100vh - 46px - 40px - 36px - 24px);background: white;overflow: auto;overflow-y:auto;" mode="inline">
                                        <a-menu-item v-for="item in playList" :key="item.id" @click="onPlayDataClick(item)"
                                        style="width: calc(100%);">
                                            <a-dropdown :trigger="['contextmenu']">
                                                <span>{{ item.name }}</span>
                                                <template #overlay>
                                                  <a-menu>
                                                    <a-menu-item :key="`${item.id}:edit`" @click="onPlayDataEditClick(item)">编辑</a-menu-item>
                                                    <a-menu-item :key="`${item.id}:delete`" @click="onPlayDataDelClick(item)">删除</a-menu-item>                                                     
                                                  </a-menu>
                                                </template>
                                            </a-dropdown>
                                        </a-menu-item>
                                    </a-menu>
                                </a-tab-pane>
                                <a-tab-pane key="pane:import" tab="导入">
                                    <MenuImportPanel :title="'非取'" :onPlayData="playM3u8Url"></MenuImportPanel>                                   
                                </a-tab-pane>
                                <!-- <a-tab-pane key="3" tab="Tab 3">Content of Tab Pane 3</a-tab-pane> -->
                            </a-tabs>                            
                        </a-layout-sider>
                        <a-layout>                           
                            <a-layout-content>
                                <div id="dplayer" style="height:calc(100vh - 46px - 40px)"></div>
                            </a-layout-content>
                        </a-layout>
                    </a-layout>
                </a-tab-pane>
                <a-tab-pane v-if="pane.tabKey !== '1'" :key="pane.tabKey" :closable="pane.closable">
                    <template #tab>
                        <span>
                            {{pane.titleFormat()}}
                        </span>
                      </template>
                    <MyBrowserView :pane="pane"/>
                </a-tab-pane>
            </template>
        </a-tabs> 
        
        <ModalSetting :modalSettingViewModel="modalSettingViewModel" ></ModalSetting>
        <ModalPlayDataEdit :playDataEditViewModel="playDataEditViewModel"></ModalPlayDataEdit>
    </div>
</template>
<script lang="ts">
 
    import { defineComponent, onBeforeUnmount, onMounted, createVNode, ref,reactive, } from 'vue'
    import { ToolOutlined, ReloadOutlined, SettingOutlined, EditOutlined,ExclamationCircleOutlined,
        MenuFoldOutlined,
        MenuUnfoldOutlined} from '@ant-design/icons-vue'
    import MyBrowserView from './components/MyBrowserView.vue'
    const _ = require('lodash')
    import {TabPaneDto} from './BrowserViewDomain/Dtos/TabPaneDto'
    import { ipcRenderer } from 'electron'
    
    import {GetPlayListResult} from './Dtos/GetPlayListResult'
    import {PlayDataDto} from  './Dtos/PlayDataDto'
    import {Setting} from './Dtos/Setting'
    const DPlayer = require('dplayer')
    import { message,Modal } from 'ant-design-vue'
    import type { SizeType } from 'ant-design-vue/es/config-provider';

    import MenuImportPanel from './components/MenuImportPanel.vue'

    import ModalPlayDataEdit from './components/ModalPlayDataEdit.vue'
    import {PlayDataEditViewModel} from './Dtos/PlayDataEditViewModel'

    import ModalSetting from './components/ModalSetting.vue'
    import {ModalSettingViewModel} from './Dtos/ModalSettingViewModel'

    import {Utils} from './Utils'
    export default defineComponent({
        components: {
            ToolOutlined,
            SettingOutlined,
            EditOutlined,
            ReloadOutlined,
            MenuFoldOutlined,
            MenuUnfoldOutlined,
            MyBrowserView,
            ModalPlayDataEdit,
            ModalSetting,
            MenuImportPanel,
        },
        setup() {
            let dp:any = null
            const panes = ref<TabPaneDto[]>([
                new TabPaneDto('首页','1',0,'',false)
            ]);
            const playList = ref<PlayDataDto[]>([]);
            const activeKey = ref(panes.value[0].tabKey);
        
            const topMenuCurrent = ref<string[]>(['tool']);
           
            
            onBeforeUnmount(function(){
                dp.destroy();
                console.log('beforeDestroy end');
            })
            onMounted(function(){
                console.log('component mounted!');                
                if(dp == null){//初始化dplayer
                    console.log('dp create');
                    dp = new DPlayer({
                        container: document.getElementById('dplayer'),
                        video: {
                            //url: history.url,
                        }
                    });
                }
                ipcRenderer.on('browserview-event',function(event:any,args:any){
                    //console.log('browserview-event',args);
                    if(args.action == 'did-finish-load'){
                        let pane = panes.value.find(item=> item.browserView_webContents_Id == args.browserView_webContents_Id);
                        if(pane != undefined){
                            pane.title = args.title;                            
                            pane.url = args.url;                            
                        }
                    }
                });
                ipcRenderer.on('find-m3u8',function(event:any,args:any){
                   // console.log('find-m3u8',args);
                    if(args.is_success){
                        let pane = panes.value.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id );
                        if(pane != undefined){
                            pane.resetDownloadBtn();
                            pane.hadFoundM3u8(args.url,args.segmentsLength);
                        }
                    }else{
                        
                    }
                });
                ipcRenderer.on('download-m3u8-ts-summary',function(event:any,args:any){
                    //console.log(args);
                    let pane = panes.value.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id );
                    if(pane != undefined){
                        pane.downloadBtn.text = `完成:${args.finishTsCount},下载中:${args.downloadingTsCount},错误:${args.errorTsCount},等待:${args.normalTsCount}`
                    }
                });
                ipcRenderer.on('finish-m3u8',
                    function(event:any,
                        args:{
                            browserView_webContents_Id:number,normalTsCount:number,
                            finishTsCount:number,
                            downloadingTsCount:number,
                            errorTsCount:number
                        }
                    ){
                    console.log('finish-m3u8',args)                    
                    let pane = panes.value.find(item=>item.browserView_webContents_Id == args.browserView_webContents_Id );
                    if(pane != undefined){
                        //pane.downloadBtn.text = `完成:${args.finishTsCount},下载中:${args.downloadingTsCount},错误:${args.errorTsCount},等待:${args.normalTsCount}`
                        pane.m3u8Complete()
                        message.info(`下载结束:${pane.title}`)
                        //如果有error的ts 可以重新下载
                        if(args.errorTsCount != 0){
                            pane.downloadBtn.text = `(点击重新下载错误Ts)${pane.downloadBtn.text}`
                        }else{
                            pane.downloadBtn.type = 'default';
                        }
                    }
                });

                getPlayList()

                ipcRenderer.invoke('get-setting',null).then((result:Setting)=>{
                    //console.log('get-setting result ',result)
                    modalSettingViewModel.value.settingForm.requestTsCountPreM3u8 = result.requestTsCountPreM3u8                    
                }).catch((err:any)=>{
                    //console.log('get-setting err ',err);
                    message.error(JSON.stringify(err))
                })
            });
            
            const getPlayList = async()=>{             
                let result:GetPlayListResult = await ipcRenderer.invoke('getPlayList', {pageIndex:1,pageSize:100})
                //playList.value.push(result.datas[result.datas.length -1])
                _.forEach(result.datas,(item:PlayDataDto) =>{
                    playList.value.push(item)
                })
            }
            const onClickRefresh = async()=>{
                playList.value = [];
                await getPlayList();
            }
        
            const add = async () => {
                try{
                    //let guid = await ipcRenderer.invoke('GetGuid',null)
                    let guid:string = await Utils.GetGuid()
                    let tabkey:string = `MyNewTabPane_${guid}`
                    let tabPane:TabPaneDto = new TabPaneDto('新标签页',tabkey ,0,'http://localhost:9001/Index',true)
                    let result = await ipcRenderer.invoke('add-browserview', tabPane)                 
                    tabPane.browserView_webContents_Id = result.browserView_webContents_Id
                    panes.value.push(tabPane)

                    activeKey.value = tabkey
                    //console.log('add-browserview-reply',result,tabPane)

                }catch(err){
                    message.error(`add Tab error: ${JSON.stringify(err)}`)
                }
            }
            
            const remove = async (targetKey: string) => {
               // console.log('remove targetKey',targetKey)
                let pane = panes.value.find(p=>p.tabKey === targetKey);
                if(pane != undefined){
                    let result = await ipcRenderer.invoke('remove-browserview', {
                        browserView_webContents_Id:pane.browserView_webContents_Id
                    })
                    //console.log('remove-browserview result',result)
                }

                let lastIndex = 0;
                panes.value.forEach((pane, i) => {
                    if (pane.tabKey === targetKey) {
                        lastIndex = i - 1;
                    }
                });
                panes.value = panes.value.filter(pane => pane.tabKey !== targetKey);
                if (panes.value.length && activeKey.value === targetKey) {
                    if (lastIndex >= 0) {
                        activeKey.value = panes.value[lastIndex].tabKey;
                    } else {
                        activeKey.value = panes.value[0].tabKey;
                    }
                }
                onChange(activeKey.value);
            };
    
            const onEdit = async (targetKey: string | MouseEvent, action: string) => {
                if (action === 'add') {
                    //console.log('add onEdit',targetKey);
                    await add();
                } else {
                    //console.log('remove onEdit',targetKey);
                    await remove(targetKey as string);
                }
            };
            const onChange = async (targetKey: string ) => {
                //console.log('targetKey',targetKey);
                if(targetKey === '1'){
                    let params = {
                        browserView_webContents_Id: -1
                    };
                    let result = await ipcRenderer.invoke('tabChange', params)
                   // console.log('onChange targetKey ',result)
                }else{
                    let pane = panes.value.find(p=>p.tabKey === targetKey);
                    if(pane != undefined){                
                        let params = {
                            browserView_webContents_Id:pane.browserView_webContents_Id
                        };
                        let result = await ipcRenderer.invoke('tabChange', params)
                      //  console.log('onChange targetKey ',result)
                    }                    
                }
            };
            
            const onPlayDataClick = (playData:PlayDataDto) =>{                
                let url = `http://localhost:9001/${playData.folder_name}/index.m3u8`
               // console.log('onPlayDataClick',url,playData)
               playM3u8Url(url)
            }
            const playM3u8Url = (url:string) =>{
                dp.switchVideo({
                    url: url,
                });
                dp.play()
            }
            const onPlayDataEditClick = (playData:PlayDataDto) =>{                
                //console.log("onPlayDataEditClick",playData)
                playDataEditViewModel.value.playDataDto = playData
                playDataEditViewModel.value.visiable = true
            }
            const onPlayDataDelClick = (playData:PlayDataDto) =>{                
                //console.log("onPlayDataDelClick",playData)
                Modal.confirm({
                    title: `注意(${playData.id})`,
                    icon: createVNode(ExclamationCircleOutlined),
                    content: createVNode('div', { style: 'color:red;' }, `是否删除,(${playData.name})`),
                    okText:'确定',
                    cancelText:'取消',
                    async onOk() {
                        //console.log('OK');
                        let ret = await ipcRenderer.invoke('DeleteM3u8Data',playData.id)
                        //console.log(ret)
                        _.remove(playList.value,(p:PlayDataDto)=>p.id == playData.id)
                        message.success('已删除');

                    },
                    onCancel() {
                        console.log('Cancel');
                    },
                    
                });
            }
            
            const onClickModelSetting = ()=>{                
                modalSettingViewModel.value.visiable = true
            }

            const layoutSiderCollapsed = ref<boolean>(false)
            // const onClickTest = ()=>{
            //     layoutSiderCollapsed.value = !layoutSiderCollapsed.value
            // }
            //const playDataEditVisiable = ref<boolean>(false)
            const playDataEditViewModel = ref<PlayDataEditViewModel>(new PlayDataEditViewModel())
            const modalSettingViewModel = ref<ModalSettingViewModel>(new ModalSettingViewModel())
            return {
                playList,
                panes,
                activeKey,
                onEdit,
                onChange,
                topMenuCurrent,
                onClickModelSetting,
                
                modalSettingViewModel,

                playM3u8Url,
                onPlayDataClick,
                onPlayDataEditClick,
                onPlayDataDelClick,
                playDataEditViewModel,
                
                //playDataEdit,
                //playDataEditVisiable,
                onClickRefresh,               

                selectedPlayData: ref<string[]>([]),
                size: ref<SizeType>('small'),
                menuTabActiveKey: ref('pane:download'),

                //onClickTest,
                layoutSiderCollapsed,
            };
        },
    });
</script>

  