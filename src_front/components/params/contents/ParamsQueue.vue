<template>
    <div class="paramsqueue parameterContent">
        <Icon name="list" class="icon" v-if="panelContext == false" />

        <div class="head" v-if="panelContext == false">
            <i18n-t scope="global" tag="p" keypath="queue.header">
                <template #LINK_OVERLAY>
                    <a @click="openOverlays()" target="_blank">{{ $t('queue.header_link_overlay') }}</a>
                </template>
            </i18n-t>
        </div>

        <section class="ctas">
            <TTButton icon="add" v-if="canCreateQueues" @click="$store.queue.createQueue(); initParams()">{{ $t('queue.addBt') }}</TTButton>
            <div class="card-item premium premiumLimit" v-else>
                <span>{{ $t('queue.premium_limit', {MAX:$config.MAX_QUEUES, MAX_PREMIUM:$config.MAX_QUEUES_PREMIUM}) }}</span>
                <TTButton icon="premium" premium light @click="openPremium()">{{ $t('premium.become_premiumBt') }}</TTButton>
            </div>
            <TTButton icon="overlay" @click="openOverlays()">{{ $t('queue.overlayBt') }}</TTButton>
        </section>

        <draggable class="queueList"
            v-model="$store.queue.queueList"
            direction="vertical"
            group="queues"
            item-key="id"
            :animation="250"
            @sort="rebuildParams()">
            <template #item="{element:entry}">
                <ToggleBlock class="queueEntry"
                    :open="false"
                    :key="entry.id"
                    editableTitle
                    v-model:title="entry.title"
                    :titleDefault="$t('queue.default_title')"
                    :titleMaxLengh="50"
                    @update:title="save(entry)">
                    <template #left_actions>
                        <Icon name="list" class="queueIcon" />
                    </template>
                    <template #right_actions>
                        <div class="actions">
                            <ToggleButton v-model="entry.enabled" @change="save(entry)" @click.stop />
                            <TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
                            <TTButton class="actionBt" alert icon="trash" @click.stop="$store.queue.deleteQueue(entry.id)" />
                        </div>
                    </template>
                    <div class="content">
                        <div class="card-item placeholder" v-tooltip="$t('queue.form.param_placeholder_tt')">
                            <Icon name="placeholder"/>
                            <span class="label">{{ $t("queue.form.param_placeholder") }}</span>
                            <PlaceholderField class="field"
                                v-model="entry.placeholderKey"
                                :prefix="'QUEUE_'"
                                @change="save(entry)" />
                        </div>
                        <ParamItem :paramData="param_max_per_user[entry.id]" v-model="entry.maxPerUser" @change="save(entry)" v-tooltip="$t('queue.form.param_max_per_user_tt')" />
                        <ParamItem :paramData="param_max_entries[entry.id]" v-model="entry.maxEntries" @change="save(entry)" v-tooltip="$t('queue.form.param_max_entries_tt')" />
                        <ParamItem :paramData="param_enableInProgress[entry.id]" v-model="entry.inProgressEnabled" @change="save(entry)" v-tooltip="$t('queue.form.param_enable_in_progress_tt')" />
                        <div class="ctas">
                            <TTButton icon="pause" v-if="!entry.paused" @click="$store.queue.pauseQueue(entry.id)">{{ $t('queue.pauseBt') }}</TTButton>
                            <TTButton icon="play" v-else @click="$store.queue.resumeQueue(entry.id)">{{ $t('queue.resumeBt') }}</TTButton>
                        </div>
                        <ToggleBlock class="entries" small :title="$t('queue.form.list_entries')" :open="false" v-tooltip="$t('queue.form.list_entries_tt')">
                            <div class="viewer" v-for="(v, index) in entry.entries" :key="v.user.id">
                                <div class="userInfo" @click="openUserCard(v.user)">
                                    <Icon :name="v.user.platform" class="platformIcon" />
                                    <img :src="v.user.avatarPath" class="avatar" v-if="v.user.avatarPath" />
                                    <span class="name">{{ v.user.displayName }} ({{ v.user.id }})</span>
                                </div>
                                <div class="actions">
                                    <TTButton icon="scrollUp" small v-if="index > 0" @click="moveUp(entry, index)" v-tooltip="$t('queue.form.move_up_tt')" />
                                    <TTButton icon="scrollDown" small v-if="index < entry.entries.length - 1" @click="moveDown(entry, index)" v-tooltip="$t('queue.form.move_down_tt')" />
                                    <TTButton icon="right" small v-if="entry.inProgressEnabled" @click="moveToProgress(entry, v)" v-tooltip="$t('queue.form.move_to_progress_tt')" />
                                    <TTButton icon="trash" alert small @click="removeViewer(entry, v)" v-tooltip="$t('queue.form.remove_viewer_tt')" />
                                </div>
                            </div>
                        </ToggleBlock>
                        <ToggleBlock class="inprogress" small v-if="entry.inProgressEnabled" :title="$t('queue.form.list_in_progress')" :open="false" v-tooltip="$t('queue.form.list_in_progress_tt')">
                            <div class="viewer" v-for="(v, index) in entry.inProgress" :key="v.user.id">
                                <div class="userInfo" @click="openUserCard(v.user)">
                                    <Icon :name="v.user.platform" class="platformIcon" />
                                    <img :src="v.user.avatarPath" class="avatar" v-if="v.user.avatarPath" />
                                    <span class="name">{{ v.user.displayName }} ({{ v.user.id }})</span>
                                </div>
                                <div class="actions">
                                    <TTButton icon="left" small @click="moveBackToQueue(entry, v)" v-tooltip="$t('queue.form.move_back_to_queue_tt')" />
                                    <TTButton icon="trash" alert small @click="removeFromProgress(entry, v)" v-tooltip="$t('queue.form.remove_viewer_tt')" />
                                </div>
                            </div>
                        </ToggleBlock>
                    </div>
                </ToggleBlock>
            </template>
        </draggable>
    </div>
</template>

<script lang="ts">
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import PlaceholderField from '@/components/PlaceholderField.vue';
import ParamItem from '../ParamItem.vue';
import draggable from 'vuedraggable';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
    components:{Icon, TTButton, ToggleBlock, ToggleButton, PlaceholderField, ParamItem, draggable}
})
class ParamsQueue extends Vue {

    @Prop({type:Boolean, default:false})
    public panelContext!:boolean;

    public param_max_per_user:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_max_entries:{[k:string]:TwitchatDataTypes.ParameterData<number>} = {};
    public param_enableInProgress:{[k:string]:TwitchatDataTypes.ParameterData<boolean>} = {};

    public mounted():void {
        this.initParams();
        this.$watch(()=>this.$store.queue.queueList,
            ()=>this.rebuildParams(), {deep:true, immediate:true});
    }

    public get canCreateQueues():boolean {
        const count = this.$store.queue.queueList.length;
        if(this.$store.auth.isPremium) return count < this.$config.MAX_QUEUES_PREMIUM;
        return count < this.$config.MAX_QUEUES;
    }

    public initParams():void {
        this.$store.queue.queueList.forEach(q=>{
            const id = q.id;
            if(this.param_max_per_user[id]) return;
            this.param_max_per_user[id] = {type:'number', value:q.maxPerUser, labelKey:'queue.form.param_max_per_user', icon:'group', min:1, max:100};
            this.param_max_entries[id] = {type:'number', value:q.maxEntries, labelKey:'queue.form.param_max_entries', icon:'list', min:0, max:100};
            this.param_enableInProgress[id] = {type:'boolean', value:q.inProgressEnabled ?? true, labelKey:'queue.form.param_enable_in_progress', icon:'list'};
        });
    }

    public rebuildParams():void {
        this.param_max_per_user = {};
        this.param_max_entries = {};
        this.param_enableInProgress = {};
        this.initParams();
    }

    public save(entry:TwitchatDataTypes.QueueData):void {
        this.$store.queue.saveData();
    }

    public openOverlays():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, 'queue');
    }

    public moveUp(queue:TwitchatDataTypes.QueueData, index:number):void {
        if(index === 0) return;
        const temp = queue.entries[index];
        queue.entries[index] = queue.entries[index - 1];
        queue.entries[index - 1] = temp;
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public moveDown(queue:TwitchatDataTypes.QueueData, index:number):void {
        if(index >= queue.entries.length - 1) return;
        const temp = queue.entries[index];
        queue.entries[index] = queue.entries[index + 1];
        queue.entries[index + 1] = temp;
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public moveToProgress(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        const index = queue.entries.findIndex(e => e.user.id === entry.user.id);
        if(index === -1) return;
        
        queue.entries.splice(index, 1);
        if(!queue.inProgress) queue.inProgress = [];
        queue.inProgress.push(entry);
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public removeViewer(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        const index = queue.entries.findIndex(e => e.user.id === entry.user.id);
        if(index === -1) return;
        
        queue.entries.splice(index, 1);
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public removeFromProgress(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        if(!queue.inProgress) return;
        
        const index = queue.inProgress.findIndex(e => e.user.id === entry.user.id);
        if(index === -1) return;
        
        queue.inProgress.splice(index, 1);
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public moveBackToQueue(queue:TwitchatDataTypes.QueueData, entry:TwitchatDataTypes.QueueEntry):void {
        if(!queue.inProgress) return;
        
        const index = queue.inProgress.findIndex(e => e.user.id === entry.user.id);
        if(index === -1) return;
        
        queue.inProgress.splice(index, 1);
        queue.entries.push(entry);
        this.$store.queue.saveData();
        this.$store.queue.broadcastStates(queue.id);
    }

    public openPremium():void {
        this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
    }

    public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
        this.$store.users.openUserCard(user, this.$store.auth.twitch.user.id, user.platform);
        
        // Close the parameters panel completely if we're not in the QueueForm panel
        if(!this.panelContext) {
            this.$store.params.closeParameters();
        }
    }

    public onNavigateBack():boolean { return false; }
}
export default toNative(ParamsQueue);
</script>

<style scoped lang="less">
.paramsqueue{
    .queueList{
        display:flex;
        flex-direction:column;
        gap:.5em;
    }
    .ctas{
        display:flex;
        gap:.25em;
        margin-top:.5em;
        flex-wrap:wrap;
        justify-content:center;
    }
    .content {
        display: flex;
        flex-direction: column;
        gap: .25em;
        
        .placeholder {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            row-gap: .25em;
            .icon {
                width: 1em;
                height: 1em;
                margin-right: .5em;
            }
            .label {
                flex-grow: 1;
                justify-self: flex-start;
            }
        }
    }
    .entries,
    .inprogress {
        margin-top:.5em;
        
        .viewer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: .5em;
            margin-bottom: .25em;
            background-color: var(--color-dark-fadest);
            border-radius: var(--border-radius);
            
            .userInfo {
                display: flex;
                align-items: center;
                gap: .5em;
                flex-grow: 1;
                margin-right: .5em;
                overflow: hidden;
                cursor: pointer;
                transition: all .2s;
                
                &:hover {
                    transform: translateX(2px);
                }
                
                .platformIcon {
                    width: 1.2em;
                    height: 1.2em;
                    flex-shrink: 0;
                }
                
                .avatar {
                    width: 1.5em;
                    height: 1.5em;
                    border-radius: 50%;
                    object-fit: cover;
                    flex-shrink: 0;
                }
                
                .name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    text-decoration: none;
                    color: inherit;
                    
                    &:hover {
                        text-decoration: underline;
                    }
                }
            }
            
            .actions {
                display: flex;
                gap: .25em;
                flex-shrink: 0;
            }
        }
    }
    .actions {
        gap: .25em;
        display: flex;
        flex-direction: row;
        align-items: center;
        margin: -.25em 0;
        align-self: stretch;
        .actionBt {
            width: 1.5em;
            min-width: 1.5em;
            border-radius: 0;
            align-self: stretch;
            &:last-child {
                margin-left: -.25em;//avoid gap between buttons without putting them in a dedicated container
            }
        }
    }
    
    .queueIcon {
        width: 1em;
        z-index: 1;
    }
}
</style>
