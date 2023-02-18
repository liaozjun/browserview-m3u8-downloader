<template>
    <a-modal v-model:visible="playDataEditViewModel.visiable" :title="`编辑(${playDataEditViewModel.playDataDto.id})`"  :footer="null">
        <a-form 
            :model="playDataEditViewModel.playDataDto"                
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            autocomplete="off"
            @finish="onFinish"
            @finishFailed="onFinishFailed"
        >
            <a-form-item label="名称" name="名称" >
                <a-input v-model:value="playDataEditViewModel.playDataDto.name" :min="1" :max="10" />
            </a-form-item>
            <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
            <a-button type="primary" html-type="submit">保存</a-button>
            </a-form-item>
        </a-form>
       
    </a-modal>
</template>
<script lang="ts">
import { defineComponent} from 'vue';
import {PlayDataEditViewModel} from '../Dtos/PlayDataEditViewModel'
import { ipcRenderer } from 'electron'
import { message } from 'ant-design-vue'
export default defineComponent({
    name: 'PlayDataEdit',
    props: {
        playDataEditViewModel: {
            type: PlayDataEditViewModel,
            required: true
        }
    },
    setup(props){ 
        const onFinish = async (values: any) => {
            
            try{
                console.log('onfi',props.playDataEditViewModel.playDataDto)
                let params = {id:props.playDataEditViewModel.playDataDto.id,name:props.playDataEditViewModel.playDataDto.name}
                let ret = await ipcRenderer.invoke('InsertOrUpdateM3u8Data',params)
                console.log(ret)
                props.playDataEditViewModel.visiable = false;
                message.success('保存成功')               
            }catch(err:any){
                message.error(err.message)
            }
        };

        const onFinishFailed = (errorInfo: any) => {
        }
        return { 
            onFinish,
            onFinishFailed
        }
    }
})
</script>