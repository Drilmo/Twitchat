<template>
        <div class="overlayqueue" :class="['position-'+position]">
                <div class="header" v-if="title || subTitle || (statePaused && paused) || (stateRunning && !paused && showRunningState)">
                        <div class="title" v-if="title" :style="titleStyles">{{ title }}</div>
                        <div class="subtitle" v-if="subTitle" :style="subTitleStyles">{{ subTitle }}</div>
                        <div class="state" v-if="(paused && statePaused) || (!paused && stateRunning && showRunningState)" :style="stateStyles">{{ paused? statePaused : stateRunning }}</div>
                </div>
                <transition name="fade">
                        <div class="inprogress" v-if="showInProgress && inProgress.length && (rotateDelay==0 || currentView=='progress')">
                                <div class="sectionTitle" :style="queueLabelStyles">{{ progressLabel }}</div>
                                <TransitionGroup name="list" tag="div">
                                        <div v-for="e in inProgress" :key="e.user.id" class="entry" :style="progressEntryStyles">
                                                <img :src="e.user.avatarPath" class="avatar" :style="{height: progressEntrySize+'px'}" />
                                                <span class="name">{{e.user.displayName}}</span>
                                        </div>
                                </TransitionGroup>
                        </div>
                </transition>
                <transition name="fade">
                        <div class="queue" v-if="rotateDelay==0 || currentView=='queue'">
                                <div class="sectionTitle" :style="queueLabelStyles">{{ queueLabel }}</div>
                                <TransitionGroup name="list" tag="div">
                                        <div v-for="e in entries" :key="e.user.id" class="entry" :style="queueEntryStyles">
                                                <img :src="e.user.avatarPath" class="avatar" :style="{height: queueEntrySize+'px'}" />
                                                <span class="name">{{e.user.displayName}}</span>
                                        </div>
                                </TransitionGroup>
                                <div v-if="entries.length === 0" class="empty" :style="queueEntryStyles">
                                        {{ emptyQueueMessage || $t('overlay.queue.empty') }}
                                </div>
                        </div>
                </transition>
        </div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TransitionGroup } from 'vue';

@Component({
        components:{
                TransitionGroup
        }
})
class OverlayQueue extends AbstractOverlay {
        public entries:TwitchatDataTypes.QueueEntry[] = [];
        public inProgress:TwitchatDataTypes.QueueEntry[] = [];
        public showInProgress:boolean = true;
        public rotateDelay:number = 0;
        public position:TwitchatDataTypes.ScreenPosition = 'bl';
        public titleFont:string = 'Roboto';
        public titleSize:number = 30;
        public titleColor:string = '#ffffff';
        public subTitleFont:string = 'Roboto';
        public subTitleSize:number = 30;
        public subTitleColor:string = '#ffffff';
        public queueLabelFont:string = 'Roboto';
        public queueLabelSize:number = 30;
        public queueLabelColor:string = '#ffffff';
        public queueEntryFont:string = 'Roboto';
        public queueEntrySize:number = 30;
        public queueEntryColor:string = '#ffffff';
        public progressEntryFont:string = 'Roboto';
        public progressEntrySize:number = 30;
        public progressEntryColor:string = '#ffffff';
        public stateFont:string = 'Roboto';
        public stateSize:number = 30;
        public stateColor:string = '#ffffff';
        public title:string = '';
        public subTitle:string = '';
        public queueLabel:string = '';
        public progressLabel:string = '';
        public paused:boolean = false;
        public currentView:'queue'|'progress' = 'queue';
        public emptyQueueMessage:string = '';
        public statePaused:string = '';
        public stateRunning:string = '';
        public showRunningState:boolean = true;

        public get titleStyles():Record<string,string>{
                return {fontFamily:this.titleFont, fontSize:this.titleSize+'px', color:this.titleColor};
        }
        public get subTitleStyles():Record<string,string>{
                return {fontFamily:this.subTitleFont, fontSize:this.subTitleSize+'px', color:this.subTitleColor};
        }
        public get queueLabelStyles():Record<string,string>{
                return {fontFamily:this.queueLabelFont, fontSize:this.queueLabelSize+'px', color:this.queueLabelColor};
        }
        public get queueEntryStyles():Record<string,string>{
                return {fontFamily:this.queueEntryFont, fontSize:this.queueEntrySize+'px', color:this.queueEntryColor};
        }
        public get progressEntryStyles():Record<string,string>{
                return {fontFamily:this.progressEntryFont, fontSize:this.progressEntrySize+'px', color:this.progressEntryColor};
        }
        public get stateStyles():Record<string,string>{
                return {fontFamily:this.stateFont, fontSize:this.stateSize+'px', color:this.stateColor};
        }

        public get stateRunning():string { return this.$t('overlay.queue.state_running') as string; }
        public get statePaused():string { return this.$t('overlay.queue.state_paused') as string; }
        
        public get hasContent():boolean { 
                return this.entries.length > 0 || this.inProgress.length > 0;
        }

        private rotationTimer:number|undefined;
        private overlayId:string = "";

        private updateHandler!:(e:TwitchatEvent)=>void;

        public mounted():void {
                this.overlayId = this.$route.query.twitchat_overlay_id as string || "";
                this.updateHandler = e=>this.onUpdate(e);
                PublicAPI.instance.addEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
                this.requestInfo();
        }
        public beforeUnmount():void {
                super.beforeUnmount();
                PublicAPI.instance.removeEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
                if(this.rotationTimer) window.clearInterval(this.rotationTimer);
        }

        public requestInfo():void {
                PublicAPI.instance.broadcast(TwitchatEvent.GET_QUEUE_STATE, {id: this.overlayId});
        }

        public onUpdate(e:TwitchatEvent):void {
                const data = e.data as unknown as TwitchatDataTypes.QueueData;
                if(!data) return;
                // Only process updates for our specific queue ID
                if(this.overlayId && data.id !== this.overlayId) return;
                this.entries = data.entries;
                this.inProgress = data.inProgress || [];
                this.showInProgress = data.overlayParams?.showInProgress !== false;
                this.rotateDelay = data.overlayParams?.rotateDelay || 0;
                this.position = data.overlayParams?.position || 'bl';
                this.titleFont = data.overlayParams?.titleFont || 'Roboto';
                this.titleSize = data.overlayParams?.titleSize || 30;
                this.titleColor = data.overlayParams?.titleColor || '#ffffff';
                this.subTitleFont = data.overlayParams?.subTitleFont || 'Roboto';
                this.subTitleSize = data.overlayParams?.subTitleSize || 30;
                this.subTitleColor = data.overlayParams?.subTitleColor || '#ffffff';
                this.queueLabelFont = data.overlayParams?.queueLabelFont || 'Roboto';
                this.queueLabelSize = data.overlayParams?.queueLabelSize || 30;
                this.queueLabelColor = data.overlayParams?.queueLabelColor || '#ffffff';
                this.queueEntryFont = data.overlayParams?.queueEntryFont || 'Roboto';
                this.queueEntrySize = data.overlayParams?.queueEntrySize || 30;
                this.queueEntryColor = data.overlayParams?.queueEntryColor || '#ffffff';
                this.progressEntryFont = data.overlayParams?.progressEntryFont || 'Roboto';
                this.progressEntrySize = data.overlayParams?.progressEntrySize || 30;
                this.progressEntryColor = data.overlayParams?.progressEntryColor || '#ffffff';
                this.stateFont = data.overlayParams?.stateFont || 'Roboto';
                this.stateSize = data.overlayParams?.stateSize || 30;
                this.stateColor = data.overlayParams?.stateColor || '#ffffff';
                this.title = data.overlayParams?.title || '';
                this.subTitle = data.overlayParams?.subTitle || '';
                this.queueLabel = data.overlayParams?.queueLabel || 'Queue';
                this.progressLabel = data.overlayParams?.progressLabel || 'In progress';
                this.emptyQueueMessage = data.overlayParams?.emptyQueueMessage || '';
                this.statePaused = data.overlayParams?.statePaused || '';
                this.stateRunning = data.overlayParams?.stateRunning || '';
                this.showRunningState = data.overlayParams?.showRunningState !== false;
                this.paused = data.paused;
                this.startRotation();
        }

        private startRotation():void {
                if(this.rotationTimer) window.clearInterval(this.rotationTimer);
                if(this.rotateDelay > 0 && this.showInProgress && this.inProgress.length>0){
                        this.currentView = 'queue';
                        this.rotationTimer = window.setInterval(()=>{
                                this.currentView = this.currentView === 'queue'? 'progress' : 'queue';
                        }, this.rotateDelay*1000);
                }else{
                        this.currentView = 'queue';
                }
        }
}
export default toNative(OverlayQueue);
</script>

<style scoped lang="less">
.overlayqueue {
        position:absolute;
        padding:1em;
        background-color: var(--color-light);
        color: var(--color-dark);
        border-radius: var(--border-radius);
        box-shadow: 0 0 .5em rgba(0, 0, 0, 1);
        text-align:left;
        font-family: var(--font-roboto);
        transition: all .3s;
        min-width: 200px;
        .header{
                margin-bottom:.5em;
                .title{
                        font-weight:bold;
                }
                .subtitle{
                        font-size:.8em;
                        opacity:.8;
                }
                .state{
                        font-size:.8em;
                        margin-top:.25em;
                        opacity:.9;
                }
        }
        .sectionTitle{
                font-weight:bold;
                margin-top:.5em;
        }
}
.entry{
        margin:2px 0;
        display:flex;
        align-items:center;
        gap:0.5em;
        padding: .25em .5em;
        background-color: var(--color-dark-fadest);
        border-radius: calc(var(--border-radius) * .5);
        transition: all .2s;
        
        &:hover {
                background-color: var(--color-dark-fader);
                transform: translateX(5px);
        }
        
        .avatar{
                border-radius:50%;
                width:auto;
                object-fit:cover;
                aspect-ratio:1;
                box-shadow: 0 0 .25em rgba(0, 0, 0, .3);
        }
        .name{
                flex:1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
        }
}
.inprogress{
        margin-top:1em;
        padding-top:.5em;
        border-top: 1px solid var(--color-dark-fadest);
}

.queue, .inprogress {
        &.fade-enter-active, &.fade-leave-active {
                transition: opacity .5s;
        }
        &.fade-enter-from, &.fade-leave-to {
                opacity: 0;
        }
}


// Classes de positionnement
@margin: 2vh;

&.position-tl{
        top:@margin;
        left:@margin;
}
&.position-t{
        top:@margin;
        left:50%;
        transform:translateX(-50%);
}
&.position-tr{
        top:@margin;
        right:@margin;
}
&.position-l{
        top:50%;
        left:@margin;
        transform:translateY(-50%);
}
&.position-m{
        top:50%;
        left:50%;
        transform:translate(-50%,-50%);
}
&.position-r{
        top:50%;
        right:@margin;
        transform:translateY(-50%);
}
&.position-bl{
        bottom:@margin;
        left:@margin;
}
&.position-b{
        bottom:@margin;
        left:50%;
        transform:translateX(-50%);
}
&.position-br{
        bottom:@margin;
        right:@margin;
}

// Animations de liste
.list-move,
.list-enter-active,
.list-leave-active {
        transition: all 0.5s ease;
}

.list-enter-from {
        opacity: 0;
        transform: translateX(-30px);
}

.list-leave-to {
        opacity: 0;
        transform: translateX(30px);
}

.list-leave-active {
        position: absolute;
        width: 100%;
}

.empty {
        opacity: 0.6;
        font-style: italic;
        padding: .5em;
        text-align: center;
}
</style>
