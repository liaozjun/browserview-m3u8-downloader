<template>
    <div>         
        <a-modal v-model:visible="visible" title="Basic Modal" @ok="handleOk">
          <p>Some contents...</p>
          <p>Some contents...</p>
          <p>Some contents...</p>
        </a-modal>
      </div>
</template>

<script lang="ts">
    import { defineComponent,ref } from 'vue';
    export default defineComponent({
        name: 'ModalSetting',        
        props: {
            visible: {
                type: Boolean,
                required: true
            },
        },
        setup(props){
            const handleOk = ()=>{

            }
            
            return { 
                handleOk
            };
        },
    });
    
</script>