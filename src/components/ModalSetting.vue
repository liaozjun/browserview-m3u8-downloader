<template>
    <a-modal v-model:visible="modalSettingViewModel.visiable" title="设置"  :footer="null">
        <a-form 
            :model="modalSettingViewModel.settingForm"                
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            autocomplete="off"
            @finish="onFinish"
            @finishFailed="onFinishFailed"
        >
            <a-form-item label="同时发起" name="同时发起" >
                <a-input-number v-model:value="modalSettingViewModel.settingForm.requestTsCountPreM3u8" :min="1" :max="10" />个请求下载TS文件/每个m3u8                
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
            <a-button type="primary" html-type="submit">保存</a-button>
            </a-form-item>
        </a-form>           
    </a-modal>
</template>

<script lang="ts">
    import { defineComponent,toRaw } from 'vue';
    import {ModalSettingViewModel} from '../Dtos/ModalSettingViewModel'
    import { ipcRenderer } from 'electron'
    import { message } from 'ant-design-vue'
    export default defineComponent({
        name: 'ModalSetting',        
        props: {
            modalSettingViewModel: {
                type: ModalSettingViewModel,
                required: true
            },
        },
        setup(props){
            
            const onFinish = async (values: any) => {
                try{
                    let result = await ipcRenderer.invoke('save-setting',toRaw(props.modalSettingViewModel.settingForm))                    
                    console.log('save-setting',result)
                    message.success('保存成功')
                    props.modalSettingViewModel.visiable = false                     
                }catch(err:any){
                    message.error(err.message)
                }
            }

            const onFinishFailed = (errorInfo: any) => {
                console.log('Failed:', errorInfo);
            }
            return { 
                onFinish,
                onFinishFailed
            }
        },
    });
    
</script>