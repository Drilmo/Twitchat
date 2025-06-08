<template>
        <div class="overlayqueue">
                <div class="queue">
                        <div v-for="e in entries" :key="e.user.id" class="entry">{{e.user.displayName}}</div>
                </div>
                <div class="inprogress" v-if="showInProgress && inProgress.length">
                        <div v-for="e in inProgress" :key="e.user.id" class="entry">{{e.user.displayName}}</div>
                </div>
        </div>
</template>

<script lang="ts">
import { Component, toNative } from 'vue-facing-decorator';
import AbstractOverlay from './AbstractOverlay';
import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

@Component({
        components:{
        }
})
class OverlayQueue extends AbstractOverlay {
        public entries:TwitchatDataTypes.QueueEntry[] = [];
        public inProgress:TwitchatDataTypes.QueueEntry[] = [];
        public showInProgress:boolean = true;

        private updateHandler!:(e:TwitchatEvent)=>void;

        public mounted():void {
                this.updateHandler = e=>this.onUpdate(e);
                PublicAPI.instance.addEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
                this.requestInfo();
        }
        public beforeUnmount():void {
                super.beforeUnmount();
                PublicAPI.instance.removeEventListener(TwitchatEvent.QUEUE_STATE, this.updateHandler);
        }

        public requestInfo():void {
                PublicAPI.instance.broadcast(TwitchatEvent.GET_QUEUE_STATE, {});
        }

        public onUpdate(e:TwitchatEvent):void {
                const data = e.data as unknown as TwitchatDataTypes.QueueData;
                if(!data) return;
                this.entries = data.entries;
                this.inProgress = data.inProgress || [];
                this.showInProgress = data.overlayParams?.showInProgress !== false;
        }
}
export default toNative(OverlayQueue);
</script>

<style scoped>
.overlayqueue {
        font-family: sans-serif;
        color: white;
}
.entry{margin:4px 0;}
.inprogress{margin-top:10px;opacity:0.7;}
</style>
