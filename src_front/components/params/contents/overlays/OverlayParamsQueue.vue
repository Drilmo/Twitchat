<template>
    <div class="overlayparamsqueue overlayParamsSection">
        <div class="header">{{ $t('overlay.queue.head') }}</div>
        <section>
            <TTButton @click="openQueueParams" icon="edit">{{ $t('overlay.queue.createQueue_bt') }}</TTButton>
        </section>
        <VueDraggable class="queueList"
            v-model="$store.queue.queueList"
            :group="{name:'queue'}"
            handle=".header"
            animation="250">
            <ToggleBlock v-for="entry in $store.queue.queueList" :title="entry.title" :open="false" :key="entry.id">
                <div class="form">
                    <div class="card-item install">
                        <label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
                        <OverlayInstaller type="queue" :sourceSuffix="entry.title" :id="entry.id" :sourceTransform="{width:300, height:200}" />
                    </div>
                    <ParamItem v-if="entry.inProgressEnabled" :paramData="param_showInProgress[entry.id]" v-model="entry.overlayParams!.showInProgress" @change="save(entry)" />
                    <ParamItem v-if="entry.inProgressEnabled && entry.overlayParams!.showInProgress" :paramData="param_rotateDelay[entry.id]" v-model="entry.overlayParams!.rotateDelay" @change="save(entry)" />
                    <ParamItem :paramData="param_title[entry.id]" v-model="entry.overlayParams!.title" @change="save(entry)">
                        <ParamItem :paramData="param_titleFont[entry.id]" :childLevel="1" v-model="entry.overlayParams!.titleFont" @change="save(entry)" />
                        <ParamItem :paramData="param_titleSize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.titleSize" @change="save(entry)" />
                        <ParamItem :paramData="param_titleColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.titleColor" @change="save(entry)" />
                    </ParamItem>

                    <ParamItem :paramData="param_subTitle[entry.id]" v-model="entry.overlayParams!.subTitle" @change="save(entry)">
                        <ParamItem :paramData="param_subTitleFont[entry.id]" :childLevel="1" v-model="entry.overlayParams!.subTitleFont" @change="save(entry)" />
                        <ParamItem :paramData="param_subTitleSize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.subTitleSize" @change="save(entry)" />
                        <ParamItem :paramData="param_subTitleColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.subTitleColor" @change="save(entry)" />
                    </ParamItem>

                    <ParamItem :paramData="param_queueLabel[entry.id]" v-model="entry.overlayParams!.queueLabel" @change="save(entry)">
                        <ParamItem :paramData="param_queueLabelFont[entry.id]" :childLevel="1" v-model="entry.overlayParams!.queueLabelFont" @change="save(entry)" />
                        <ParamItem :paramData="param_queueLabelSize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.queueLabelSize" @change="save(entry)" />
                        <ParamItem :paramData="param_queueLabelColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.queueLabelColor" @change="save(entry)" />
                    </ParamItem>

                    <ParamItem v-if="entry.inProgressEnabled" :paramData="param_progressLabel[entry.id]" v-model="entry.overlayParams!.progressLabel" @change="save(entry)" />

                    <ParamItem :paramData="param_emptyQueueMessage[entry.id]" v-model="entry.overlayParams!.emptyQueueMessage" @change="save(entry)" />

                    <ParamItem :paramData="param_queueEntryFont[entry.id]" v-model="entry.overlayParams!.queueEntryFont" @change="save(entry)">
                        <ParamItem :paramData="param_queueEntrySize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.queueEntrySize" @change="save(entry)" />
                        <ParamItem :paramData="param_queueEntryColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.queueEntryColor" @change="save(entry)" />
                    </ParamItem>

                    <ParamItem v-if="entry.inProgressEnabled" :paramData="param_progressEntryFont[entry.id]" v-model="entry.overlayParams!.progressEntryFont" @change="save(entry)">
                        <ParamItem :paramData="param_progressEntrySize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.progressEntrySize" @change="save(entry)" />
                        <ParamItem :paramData="param_progressEntryColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.progressEntryColor" @change="save(entry)" />
                    </ParamItem>

                    <ParamItem :paramData="param_statePaused[entry.id]" v-model="entry.overlayParams!.statePaused" @change="save(entry)" />
                    <ParamItem :paramData="param_showRunningState[entry.id]" v-model="entry.overlayParams!.showRunningState" @change="save(entry)" />
                    <ParamItem :paramData="param_stateRunning[entry.id]" v-model="entry.overlayParams!.stateRunning" @change="save(entry)" v-if="entry.overlayParams!.showRunningState" />
                    <ParamItem :paramData="param_stateFont[entry.id]" v-model="entry.overlayParams!.stateFont" @change="save(entry)">
                        <ParamItem :paramData="param_stateSize[entry.id]" :childLevel="1" v-model="entry.overlayParams!.stateSize" @change="save(entry)" />
                        <ParamItem :paramData="param_stateColor[entry.id]" :childLevel="1" noBackground v-model="entry.overlayParams!.stateColor" @change="save(entry)" />
                    </ParamItem>
                    <div class="card-item placement">
                        <p>{{ $t('overlay.queue.param_placement') }}</p>
                        <PlacementSelector v-model="entry.overlayParams!.position" @change="save(entry)" />
                    </div>

                    <div class="testButtons">
                        <TTButton icon="test" @click="testAdd(entry)">{{ $t('overlay.queue.testAddBt') }}</TTButton>
                        <TTButton icon="test" @click="testMove(entry)">{{ $t('overlay.queue.testMoveBt') }}</TTButton>
                        <TTButton icon="test" @click="testRemove(entry)">{{ $t('overlay.queue.testRemoveBt') }}</TTButton>
                        <TTButton icon="test" v-if="entry.overlayParams!.showInProgress" @click="testRemoveProg(entry)">{{ $t('overlay.queue.testRemoveProgBt') }}</TTButton>
                    </div>
                </div>
            </ToggleBlock>
        </VueDraggable>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { TTButton } from '@/components/TTButton.vue';
import { ToggleBlock } from '@/components/ToggleBlock.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import { VueDraggable } from 'vue-draggable-plus';
import { ParamItem } from '../../ParamItem.vue';
import PlacementSelector from '@/components/PlacementSelector.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
    components:{TTButton, ToggleBlock, OverlayInstaller, VueDraggable, ParamItem, PlacementSelector},
    emits:[]
})
class OverlayParamsQueue extends Vue {
    public param_showInProgress:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
    public param_rotateDelay:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_position:{[k:string]:TwitchatDataTypes.ParameterData<TwitchatDataTypes.ScreenPosition>} = {};
    public param_titleFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_titleSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_titleColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitleFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitleSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_subTitleColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueLabelFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueLabelSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueLabelColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueEntryFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueEntrySize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_queueEntryColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressEntryFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressEntrySize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_progressEntryColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateFont:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateSize:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_stateColor:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_title:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_subTitle:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_queueLabel:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_progressLabel:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_emptyQueueMessage:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_statePaused:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_stateRunning:{[k:string]:TwitchatDataTypes.ParameterData<string>} = {};
    public param_showRunningState:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};

    public mounted():void { this.initParams(); }

    private initParams():void {
        this.$store.queue.queueList.forEach(q => {
            const id = q.id;
            this.param_showInProgress[id] = {type:'boolean', value:q.overlayParams?.showInProgress ?? true, labelKey:'queue.form.param_show_in_progress', icon:'show'};
            this.param_rotateDelay[id] = {type:'number', value:q.overlayParams?.rotateDelay ?? 0, labelKey:'queue.form.param_rotate_delay', icon:'timer', min:0, max:60};
            this.param_position[id] = {type:'list', value:q.overlayParams?.position ?? 'bl', labelKey:'overlay.queue.param_placement', icon:'move'};
            this.param_titleFont[id] = {type:'font', value:q.overlayParams?.titleFont ?? 'Roboto', labelKey:'overlay.queue.param_titleFont', icon:'font'};
            this.param_titleSize[id] = {type:'number', value:q.overlayParams?.titleSize ?? 30, labelKey:'overlay.queue.param_titleSize', icon:'fontSize', min:10, max:150};
            this.param_titleColor[id] = {type:'color', value:q.overlayParams?.titleColor ?? '#ffffff', labelKey:'overlay.queue.param_titleColor', icon:'color'};
            this.param_subTitleFont[id] = {type:'font', value:q.overlayParams?.subTitleFont ?? 'Roboto', labelKey:'overlay.queue.param_subTitleFont', icon:'font'};
            this.param_subTitleSize[id] = {type:'number', value:q.overlayParams?.subTitleSize ?? 30, labelKey:'overlay.queue.param_subTitleSize', icon:'fontSize', min:10, max:150};
            this.param_subTitleColor[id] = {type:'color', value:q.overlayParams?.subTitleColor ?? '#ffffff', labelKey:'overlay.queue.param_subTitleColor', icon:'color'};
            this.param_queueLabelFont[id] = {type:'font', value:q.overlayParams?.queueLabelFont ?? 'Roboto', labelKey:'overlay.queue.param_queueLabelFont', icon:'font'};
            this.param_queueLabelSize[id] = {type:'number', value:q.overlayParams?.queueLabelSize ?? 30, labelKey:'overlay.queue.param_queueLabelSize', icon:'fontSize', min:10, max:150};
            this.param_queueLabelColor[id] = {type:'color', value:q.overlayParams?.queueLabelColor ?? '#ffffff', labelKey:'overlay.queue.param_queueLabelColor', icon:'color'};
            this.param_queueEntryFont[id] = {type:'font', value:q.overlayParams?.queueEntryFont ?? 'Roboto', labelKey:'overlay.queue.param_queueEntryFont', icon:'font'};
            this.param_queueEntrySize[id] = {type:'number', value:q.overlayParams?.queueEntrySize ?? 30, labelKey:'overlay.queue.param_queueEntrySize', icon:'fontSize', min:10, max:150};
            this.param_queueEntryColor[id] = {type:'color', value:q.overlayParams?.queueEntryColor ?? '#ffffff', labelKey:'overlay.queue.param_queueEntryColor', icon:'color'};
            this.param_progressEntryFont[id] = {type:'font', value:q.overlayParams?.progressEntryFont ?? 'Roboto', labelKey:'overlay.queue.param_progressEntryFont', icon:'font'};
            this.param_progressEntrySize[id] = {type:'number', value:q.overlayParams?.progressEntrySize ?? 30, labelKey:'overlay.queue.param_progressEntrySize', icon:'fontSize', min:10, max:150};
            this.param_progressEntryColor[id] = {type:'color', value:q.overlayParams?.progressEntryColor ?? '#ffffff', labelKey:'overlay.queue.param_progressEntryColor', icon:'color'};
            this.param_stateFont[id] = {type:'font', value:q.overlayParams?.stateFont ?? 'Roboto', labelKey:'overlay.queue.param_stateFont', icon:'font'};
            this.param_stateSize[id] = {type:'number', value:q.overlayParams?.stateSize ?? 30, labelKey:'overlay.queue.param_stateSize', icon:'fontSize', min:10, max:150};
            this.param_stateColor[id] = {type:'color', value:q.overlayParams?.stateColor ?? '#ffffff', labelKey:'overlay.queue.param_stateColor', icon:'color'};
            this.param_title[id] = {type:'string', value:q.overlayParams?.title ?? '', maxLength:50, labelKey:'overlay.queue.param_title', icon:'text'};
            this.param_subTitle[id] = {type:'string', value:q.overlayParams?.subTitle ?? '', maxLength:50, labelKey:'overlay.queue.param_subTitle', icon:'text'};
            this.param_queueLabel[id] = {type:'string', value:q.overlayParams?.queueLabel ?? 'Queue', maxLength:50, labelKey:'overlay.queue.param_queueLabel', icon:'text'};
            this.param_progressLabel[id] = {type:'string', value:q.overlayParams?.progressLabel ?? 'In progress', maxLength:50, labelKey:'overlay.queue.param_progressLabel', icon:'text'};
            this.param_emptyQueueMessage[id] = {type:'string', value:q.overlayParams?.emptyQueueMessage ?? '', maxLength:100, labelKey:'overlay.queue.param_emptyQueueMessage', icon:'text'};
            this.param_statePaused[id] = {type:'string', value:q.overlayParams?.statePaused ?? '', maxLength:50, labelKey:'overlay.queue.param_statePaused', icon:'text'};
            this.param_stateRunning[id] = {type:'string', value:q.overlayParams?.stateRunning ?? '', maxLength:50, labelKey:'overlay.queue.param_stateRunning', icon:'text'};
            this.param_showRunningState[id] = {type:'boolean', value:q.overlayParams?.showRunningState !== false, labelKey:'overlay.queue.param_showRunningState', icon:'checkmark'};
        });
    }
    public save(entry:TwitchatDataTypes.QueueData):void {
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(entry.id);
    }

    public openQueueParams():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.QUEUES);
    }

    private getFakeUser(entry:TwitchatDataTypes.QueueData):TwitchatDataTypes.TwitchatUser {
        const id = 'queue_test_' + entry.id;
        return this.$store.users.getUserFrom('twitch', this.$store.auth.twitch.user.id, id, 'TestUser', 'Test user');
    }

    public testAdd(entry:TwitchatDataTypes.QueueData):void {
        const user = this.getFakeUser(entry);
        this.$store.queue.addViewer(entry.id, user);
    }

    public testMove(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.moveToInProgress(entry.id, id);
    }

    public testRemove(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.removeViewerFromQueue(entry.id, id);
    }

    public testRemoveProg(entry:TwitchatDataTypes.QueueData):void {
        const id = 'queue_test_' + entry.id;
        this.$store.queue.removeViewerFromInProgress(entry.id, id);
    }
}
export default toNative(OverlayParamsQueue);
</script>

<style scoped lang="less">
.overlayparamsqueue{
    .queueList{display:flex;flex-direction:column;gap:.5em;}
    .testButtons{display:flex;gap:.5em;margin-top:.5em;flex-wrap:wrap;}
    .placement{display:flex;flex-direction:column;align-items:center;}
}
</style>
