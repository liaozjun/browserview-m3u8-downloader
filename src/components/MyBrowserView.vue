<template>
    <a-row style="margin-top:5px;">
        <a-col :span="10"> 
            <a-input-group compact>
                
                <a-button-group  >
                    <a-button type="text" @click="onGoBackClick" :disabled="pane.isDownloadingM3u8">
                        <template #icon><LeftOutlined /></template>                     
                    </a-button>
                    <a-button type="text" @click="onGoForwardClick" :disabled="pane.isDownloadingM3u8">
                        <template #icon><RightOutlined /></template>                     
                    </a-button>
                    <a-button type="text" @click="onReloadClick" :disabled="pane.isDownloadingM3u8">
                        <template #icon><ReloadOutlined /></template>                     
                    </a-button>
                </a-button-group>
                
                <a-input v-model:value="pane.url" style="width: calc(80%)" />
                <a-button type="text" @click="onNavigationClick" :disabled="pane.isDownloadingM3u8">
                    <template #icon><ArrowRightOutlined/></template>
                </a-button> 
                
                
                <!-- 
                
                <a-button @click="OnDownloadBtnClick" :type="pane.downloadBtn.type" :disabled="pane.downloadBtn.disabled">{{pane.downloadBtn.text}}</a-button>
                
                <div style="font-size: xx-small;"></div> -->
            </a-input-group>
        </a-col>
        <a-col :span="8">
            <a-input-search allow-clear enter-button="下载" v-model:value="pane.title" 
                addon-before="标题" :disabled="pane.downloadBtn.disabled"
            />
         
        </a-col>
        <a-col :span="6">
            <a-badge count="123"  :overflow-count="10000"></a-badge>
            <a-badge count="456" :overflow-count="10000"></a-badge>
            <a-badge count="9999" :overflow-count="10000"></a-badge>
        </a-col>
    </a-row>
  </template>
  
  <script lang="ts">
  import { defineComponent,createVNode} from 'vue';
  import { LeftOutlined ,RightOutlined,ReloadOutlined,ArrowRightOutlined} from '@ant-design/icons-vue';
  import { ipcRenderer } from 'electron'
  import {TabPaneDto} from '../BrowserViewDomain/Dtos/TabPaneDto'
import { message } from 'ant-design-vue';
 
  export default defineComponent({
    name: 'MyBrowserView',
    components: {
      LeftOutlined,
      RightOutlined,
      ReloadOutlined,
      ArrowRightOutlined,
      
    },
    props: {
        pane: {
            type: TabPaneDto,
            required: true
        },
    },
    setup(props){
         
        const OnDownloadBtnClick = async () =>{
            let params = {
                title:props.pane.title,
                browserView_webContents_Id:props.pane.browserView_webContents_Id
            };

            try{
                message.warning('未完成下载，不要操作页面进行跳转，不能关闭当前页签!!!');
                await ipcRenderer.invoke('download-m3u8', params)
                props.pane.m3u8Downloading()
            }catch(err:any){
                message.error(err.message);
            }             
        };
        const onNavigationClick = ()=>{
            let params = {
                action:'navigation',
                tabKey: props.pane.tabKey,
                url: props.pane.url,
                browserView_webContents_Id: props.pane.browserView_webContents_Id
            };
            props.pane.resetDownloadBtn();
            ipcRenderer.invoke('browserview_navigation', params).then((result:any) => {                
                console.log(result);
            });
        };
        const onGoBackClick = ()=>{
            props.pane.resetDownloadBtn();
            ipcRenderer.invoke('browserview_navigation', {action:'goBack' ,browserView_webContents_Id: props.pane.browserView_webContents_Id}).then((result:any) => {                
                console.log(result);
            });
        };
        const onGoForwardClick=()=>{
            props.pane.resetDownloadBtn();
            ipcRenderer.invoke('browserview_navigation', {action:'goForward',browserView_webContents_Id: props.pane.browserView_webContents_Id}).then((result:any) => {                
                console.log(result);
            });
        };
        const onReloadClick = ()=>{
            props.pane.resetDownloadBtn();
            ipcRenderer.invoke('browserview_navigation', {action:'reload',browserView_webContents_Id: props.pane.browserView_webContents_Id}).then((result:any) => {                
                console.log(result);
            });
        };
    
        return {
            onNavigationClick,
            OnDownloadBtnClick,
            onGoBackClick,
            onGoForwardClick,
            onReloadClick,
        };
    },
  });
  </script>
   