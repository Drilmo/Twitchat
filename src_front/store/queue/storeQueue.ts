import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IQueueActions, type IQueueGetters, type IQueueState } from '../StoreProxy';

const getDefaultOverlayParams = ():NonNullable<TwitchatDataTypes.QueueData["overlayParams"]> => ({
        showInProgress:true,
        rotateDelay:0,
        position:"bl",
        titleFont:"Roboto",
        titleSize:30,
        titleColor:"#ffffff",
        titleBgColor:"#000000",
        titleBgOpacity:80,
        subTitleFont:"Roboto",
        subTitleSize:30,
        subTitleColor:"#ffffff",
        subTitleBgColor:"#000000",
        subTitleBgOpacity:80,
        queueLabelFont:"Roboto",
        queueLabelSize:30,
        queueLabelColor:"#ffffff",
        queueBgColor:"#000000",
        queueBgOpacity:80,
        queueEntryFont:"Roboto",
        queueEntrySize:30,
        queueEntryColor:"#ffffff",
        queueEntryBgColor:"#000000",
        queueEntryBgOpacity:0,
        progressEntryFont:"Roboto",
        progressEntrySize:30,
        progressEntryColor:"#ffffff",
        progressBgColor:"#000000",
        progressBgOpacity:80,
        stateFont:"Roboto",
        stateSize:30,
        stateColor:"#ffffff",
        stateBgColor:"#000000",
        stateBgOpacity:80,
        statePausedFont:"Roboto",
        statePausedSize:30,
        statePausedColor:"#ffffff",
        statePausedBgColor:"#000000",
        statePausedBgOpacity:80,
        stateRunningFont:"Roboto",
        stateRunningSize:30,
        stateRunningColor:"#ffffff",
        stateRunningBgColor:"#000000",
        stateRunningBgOpacity:80,
        title:StoreProxy.i18n.t('queue.default_title') as string,
        subTitle:"",
        queueLabel:StoreProxy.i18n.t('queue.default_title') as string,
        progressLabel:StoreProxy.i18n.t('overlay.queue.param_progressLabel') as string,
        showEmptyQueueMessage:true,
        emptyQueueMessage:StoreProxy.i18n.t('overlay.queue.empty') as string,
        emptyQueueFont:"Roboto",
        emptyQueueSize:30,
        emptyQueueColor:"#ffffff",
        emptyQueueBgColor:"#000000",
        emptyQueueBgOpacity:0,
        statePaused:StoreProxy.i18n.t('overlay.queue.state_paused') as string,
        stateRunning:StoreProxy.i18n.t('overlay.queue.state_running') as string,
        showPausedState:true,
        showRunningState:true,
        sectionsOrder:['title', 'subtitle', 'state', 'queue', 'progress'],
});

export const storeQueue = defineStore('queue', {
        state: () => ({
                queueList: [] as TwitchatDataTypes.QueueData[],
        } as IQueueState),

        getters: {
                queues: (state:IQueueState):string[] => state.queueList.map(q => q.placeholderKey),
                runningEntries: (state:IQueueState):number => state.queueList.reduce((p,c)=>p+c.entries.length+(c.inProgress?.length||0),0),
        } as unknown as IQueueGetters
        & ThisType<UnwrapRef<IQueueState> & _StoreWithGetters<IQueueGetters> & PiniaCustomProperties>
        & _GettersTree<IQueueState>,

        actions: {
                populateData() {
                        const json = DataStore.get(DataStore.QUEUE_CONFIGS);
                        if(json) {
                                const data = JSON.parse(json) as IStoreData;
                                this.queueList = data.queueList || [];
                                //If queueList is empty, create a default queue
                                if(this.queueList.length === 0) {
                                        this.createQueue();
                                }
                                //fallback defaults for new properties
                                for (const q of this.queueList) {
                                        if(q.inProgressEnabled === undefined) q.inProgressEnabled = true;
                                        if(!q.overlayParams) q.overlayParams = getDefaultOverlayParams();
                                        else {
                                                const def = getDefaultOverlayParams();
                                                q.overlayParams.showInProgress ??= def.showInProgress;
                                                q.overlayParams.rotateDelay ??= def.rotateDelay;
                                                q.overlayParams.position ??= def.position;
                                                q.overlayParams.titleFont ??= def.titleFont;
                                                q.overlayParams.titleSize ??= def.titleSize;
                                                q.overlayParams.titleColor ??= def.titleColor;
                                                q.overlayParams.titleBgColor ??= def.titleBgColor;
                                                q.overlayParams.titleBgOpacity ??= def.titleBgOpacity;
                                                q.overlayParams.subTitleFont ??= def.subTitleFont;
                                                q.overlayParams.subTitleSize ??= def.subTitleSize;
                                                q.overlayParams.subTitleColor ??= def.subTitleColor;
                                                q.overlayParams.subTitleBgColor ??= def.subTitleBgColor;
                                                q.overlayParams.subTitleBgOpacity ??= def.subTitleBgOpacity;
                                                q.overlayParams.queueLabelFont ??= def.queueLabelFont;
                                                q.overlayParams.queueLabelSize ??= def.queueLabelSize;
                                                q.overlayParams.queueLabelColor ??= def.queueLabelColor;
                                                q.overlayParams.queueBgColor ??= def.queueBgColor;
                                                q.overlayParams.queueBgOpacity ??= def.queueBgOpacity;
                                                q.overlayParams.queueEntryFont ??= def.queueEntryFont;
                                                q.overlayParams.queueEntrySize ??= def.queueEntrySize;
                                                q.overlayParams.queueEntryColor ??= def.queueEntryColor;
                                                q.overlayParams.queueEntryBgColor ??= def.queueEntryBgColor;
                                                q.overlayParams.queueEntryBgOpacity ??= def.queueEntryBgOpacity;
                                                q.overlayParams.progressEntryFont ??= def.progressEntryFont;
                                                q.overlayParams.progressEntrySize ??= def.progressEntrySize;
                                                q.overlayParams.progressEntryColor ??= def.progressEntryColor;
                                                q.overlayParams.progressBgColor ??= def.progressBgColor;
                                                q.overlayParams.progressBgOpacity ??= def.progressBgOpacity;
                                                q.overlayParams.stateFont ??= def.stateFont;
                                                q.overlayParams.stateSize ??= def.stateSize;
                                                q.overlayParams.stateColor ??= def.stateColor;
                                                q.overlayParams.stateBgColor ??= def.stateBgColor;
                                                q.overlayParams.stateBgOpacity ??= def.stateBgOpacity;
                                                q.overlayParams.title ??= def.title;
                                                q.overlayParams.subTitle ??= def.subTitle;
                                                q.overlayParams.queueLabel ??= def.queueLabel;
                                                q.overlayParams.progressLabel ??= def.progressLabel;
                                                q.overlayParams.showEmptyQueueMessage ??= def.showEmptyQueueMessage;
                                                q.overlayParams.emptyQueueMessage ??= def.emptyQueueMessage;
                                                q.overlayParams.emptyQueueFont ??= def.emptyQueueFont;
                                                q.overlayParams.emptyQueueSize ??= def.emptyQueueSize;
                                                q.overlayParams.emptyQueueColor ??= def.emptyQueueColor;
                                                q.overlayParams.emptyQueueBgColor ??= def.emptyQueueBgColor;
                                                q.overlayParams.emptyQueueBgOpacity ??= def.emptyQueueBgOpacity;
                                                q.overlayParams.statePaused ??= def.statePaused;
                                                q.overlayParams.stateRunning ??= def.stateRunning;
                                                q.overlayParams.showPausedState ??= def.showPausedState;
                                                q.overlayParams.showRunningState ??= def.showRunningState;
                                                q.overlayParams.statePausedFont ??= def.statePausedFont;
                                                q.overlayParams.statePausedSize ??= def.statePausedSize;
                                                q.overlayParams.statePausedColor ??= def.statePausedColor;
                                                q.overlayParams.statePausedBgColor ??= def.statePausedBgColor;
                                                q.overlayParams.statePausedBgOpacity ??= def.statePausedBgOpacity;
                                                q.overlayParams.stateRunningFont ??= def.stateRunningFont;
                                                q.overlayParams.stateRunningSize ??= def.stateRunningSize;
                                                q.overlayParams.stateRunningColor ??= def.stateRunningColor;
                                                q.overlayParams.stateRunningBgColor ??= def.stateRunningBgColor;
                                                q.overlayParams.stateRunningBgOpacity ??= def.stateRunningBgOpacity;
                                                q.overlayParams.sectionsOrder ??= def.sectionsOrder;
                                        }
                                }
                        }else{
                                //Create a default queue on first start so users
                                //immediately see one entry in the queue menu
                                this.createQueue();
                                this.saveData();
                        }
                        PublicAPI.instance.addEventListener(TwitchatEvent.GET_QUEUE_STATE, (event:TwitchatEvent<{ id?:string }>)=> {
                                if(event.data?.id) {
                                        this.broadcastStates(event.data.id);
                                }else{
                                        for (let i = 0; i < this.queueList.length; i++) {
                                                const entry = this.queueList[i];
                                                this.broadcastStates(entry.id);
                                        }
                                }
                        });
                },

                broadcastStates(id?:string) {
                        for (let i = 0; i < this.queueList.length; i++) {
                                const entry = this.queueList[i];
                                if(id && entry.id !== id) continue;
                                PublicAPI.instance.broadcast(TwitchatEvent.QUEUE_STATE, entry as unknown as JsonObject);
                        }
                },

                createQueue() {
                        if(!StoreProxy.auth.isPremium && this.queueList.length >= Config.instance.MAX_QUEUES) return;
                        const data:TwitchatDataTypes.QueueData = {
                                id:Utils.getUUID(),
                                enabled:true,
                                title:StoreProxy.i18n.t('queue.default_title') as string,
                                placeholderKey:'QUEUE_'+(this.queueList.length+1),
                                maxPerUser:1,
                                maxEntries:0,
                                inProgressEnabled:true,
                                paused:false,
                                entries:[],
                                inProgress:[],
                                overlayParams:getDefaultOverlayParams(),
                        };
                        this.queueList.push(data);
                        this.saveData();
                },

                deleteQueue(id:string) {
                        const idx = this.queueList.findIndex(q => q.id === id);
                        if(idx >= 0) this.queueList.splice(idx,1);
                        this.saveData();
                },

                addViewer(id:string, user:TwitchatDataTypes.TwitchatUser) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        // Count entries in both queue and in-progress lists
                        const countInQueue = q.entries.filter(e=>e.user.id==user.id).length;
                        const countInProgress = (q.inProgress || []).filter(e=>e.user.id==user.id).length;
                        const totalCount = countInQueue + countInProgress;
                        if(totalCount >= q.maxPerUser) return;
                        if(q.maxEntries > 0 && q.entries.length >= q.maxEntries) return;
                        q.entries.push({user, joined_at:Date.now()});
                        this.saveData();
                        this.broadcastStates(id);
                },

                removeViewer(id:string, userId:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        q.entries = q.entries.filter(e=>e.user.id!=userId);
                        q.inProgress = q.inProgress?.filter(e=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);
                },

                removeViewerFromQueue(id:string, userId:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        q.entries = q.entries.filter(e=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);
                },

                removeViewerFromInProgress(id:string, userId:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        q.inProgress = q.inProgress?.filter(e=>e.user.id!=userId);
                        this.saveData();
                        this.broadcastStates(id);
                },

                moveToInProgress(id:string, userId:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        if(!q.inProgressEnabled) return;
                        const idx = q.entries.findIndex(e=>e.user.id==userId);
                        if(idx>-1) {
                                const entry = q.entries.splice(idx,1)[0];
                                q.inProgress = q.inProgress || [];
                                q.inProgress.push(entry);
                                this.saveData();
                                this.broadcastStates(id);
                        }
                },

                pauseQueue(id:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        q.paused = true;
                        this.saveData();
                        this.broadcastStates(id);
                },

                resumeQueue(id:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
                        q.paused = false;
                        this.saveData();
                        this.broadcastStates(id);
                },

                saveData() {
                        for(const q of this.queueList){
                                if(!q.inProgressEnabled){
                                        q.inProgress = [];
                                        if(q.overlayParams) q.overlayParams.showInProgress = false;
                                }
                                if(!q.overlayParams) q.overlayParams = getDefaultOverlayParams();
                        }
                        const data:IStoreData = { queueList:this.queueList };
                        DataStore.set(DataStore.QUEUE_CONFIGS, data as unknown as JsonObject);
                },
        } as IQueueActions
        & ThisType<IQueueActions
                & UnwrapRef<IQueueState>
                & _StoreWithState<'queue', IQueueState, IQueueGetters, IQueueActions>
                & _StoreWithGetters<IQueueGetters>
                & PiniaCustomProperties
        >,
});

if(import.meta.hot) {
        import.meta.hot.accept(acceptHMRUpdate(storeQueue, import.meta.hot))
}

interface IStoreData {
        queueList:TwitchatDataTypes.QueueData[];
}
