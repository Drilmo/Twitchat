import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IQueueActions, type IQueueGetters, type IQueueState } from '../StoreProxy';

export const storeQueue = defineStore('queue', {
        state: () => ({
                queueList: [] as TwitchatDataTypes.QueueData[],
        } as IQueueState),

        getters: {
                queues: (state) => state.queueList.map(q => q.placeholderKey),
                runningEntries: (state) => state.queueList.reduce((p,c)=>p+c.entries.length+(c.inProgress?.length||0),0),
        } as IQueueGetters
        & ThisType<UnwrapRef<IQueueState> & _StoreWithGetters<IQueueGetters> & PiniaCustomProperties>
        & _GettersTree<IQueueState>,

        actions: {
                populateData() {
                        const json = DataStore.get(DataStore.QUEUE_CONFIGS);
                        if(json) {
                                const data = JSON.parse(json) as IStoreData;
                                this.queueList = data.queueList;
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
                                PublicAPI.instance.broadcast(TwitchatEvent.QUEUE_STATE, entry);
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
                                paused:false,
                                entries:[],
                                inProgress:[],
                                overlayParams:{showInProgress:true},
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
                        const count = q.entries.filter(e=>e.user.id==user.id).length;
                        if(count >= q.maxPerUser) return;
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

                moveToInProgress(id:string, userId:string) {
                        const q = this.queueList.find(v=>v.id==id);
                        if(!q) return;
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
                        const data:IStoreData = { queueList:this.queueList };
                        DataStore.set(DataStore.QUEUE_CONFIGS, data);
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
