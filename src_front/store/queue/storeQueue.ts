import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IQueueActions, type IQueueGetters, type IQueueState } from '../StoreProxy';

const getDefaultOverlayParams = ():TwitchatDataTypes.QueueOverlayParams => {
	return {
		style:"text",
		orientation:"vertical",
		displayMode:"queue",
		scrolling:false,
		bgColor:"#ffffff",
		showIcon:true,
		bgEnabled:true,
		textFont:"Roboto",
		textSize:32,
		textColor:"#18181b",
	}
}

export const storeQueue = defineStore('queue', {
	state: () => ({
		queueList: [] as TwitchatDataTypes.QueueData[],
	} as IQueueState),



	getters: {
	} as IQueueGetters
	& ThisType<UnwrapRef<IQueueState> & _StoreWithGetters<IQueueGetters> & PiniaCustomProperties>
	& _GettersTree<IQueueState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.QUEUES_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.queueList = data.queueList;
			}
			
			// Create default queue if missing
			const defaultQueue:TwitchatDataTypes.QueueData = {
				id:Utils.getUUID(),
				title:StoreProxy.i18n.t("queues.default.queue_title"),
				enabled:true,
				isDefault:true,
				placeholderKey:"DEFAULT",
				queueEntries:[],
				inProgressEntries:[],
				overlayParams: getDefaultOverlayParams(),
			}

			if (!this.queueList.some(queue => queue.isDefault)) {
				this.queueList.unshift(defaultQueue);
			}

			this.saveData();

			/**
			 * Called when queue overlay requests for a queue info
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_QUEUES, (event:TwitchatEvent<{ id?:string }>)=> {
				if(event.data?.id) {
					this.broadcastStates(event.data.id);
				}else{
					//Broadcast default queues states
					for (let i = 0; i < this.queueList.length; i++) {
						const entry = this.queueList[i];
						if(!entry.isDefault) continue;
						this.broadcastStates(entry.id);
					}
				}
			});
		},

		broadcastStates(id?:string) {
			for (let i = 0; i < this.queueList.length; i++) {
				const entry = this.queueList[i];
				if(id && entry.id !== id) continue;

				PublicAPI.instance.broadcast(TwitchatEvent.QUEUE_UPDATE, entry);
			}
		},

		createQueue() {
			// +1 is to account for the default queue
			const MAX_QUEUES = Config.instance.MAX_TIMERS; // Réutilisation de la même constante que pour les timers
			if(!StoreProxy.auth.isPremium && this.queueList.length >= MAX_QUEUES + 1) return;
			
			const data:TwitchatDataTypes.QueueData = {
				id:Utils.getUUID(),
				title:"",
				enabled:true,
				isDefault:false,
				placeholderKey:"",
				queueEntries:[],
				inProgressEntries:[],
				overlayParams: getDefaultOverlayParams(),
			}
			this.queueList.push(data);
			this.saveData();
		},

		deleteQueue(id:string) {
			const index = this.queueList.findIndex(q => q.id === id);
			if(index == -1) return;
			StoreProxy.main.confirm(StoreProxy.i18n.t("queues.delete_confirm.title"), StoreProxy.i18n.t("queues.delete_confirm.message"))
			.then(()=> {
				this.queueList.splice(index, 1);
				this.saveData();
			}).catch(_=> {});
		},

		/**
		 * Add a user to a queue
		 * @param queueId ID of the queue
		 * @param user User to add
		 * @param note Optional note/message
		 * @returns The entry created or null if already in the queue
		 */
		addUserToQueue(queueId:string, user:TwitchatDataTypes.TwitchatUser, note?:string):TwitchatDataTypes.QueueEntry|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return null;
			
			// Check if user already in queue or in progress
			if(queue.queueEntries.some(e => e.user.id === user.id)
			|| queue.inProgressEntries.some(e => e.user.id === user.id)) {
				return null;
			}

			const entry:TwitchatDataTypes.QueueEntry = {
				id: Utils.getUUID(),
				user,
				joinedAt: Date.now(),
				note,
			};

			queue.queueEntries.push(entry);
			this.saveData();
			this.broadcastStates(queueId);

			return entry;
		},

		/**
		 * Add a user to the in-progress list of a queue
		 * @param queueId ID of the queue
		 * @param user User to add
		 * @param note Optional note/message
		 * @returns The entry created or null if already in the in-progress list
		 */
		addUserToInProgress(queueId:string, user:TwitchatDataTypes.TwitchatUser, note?:string):TwitchatDataTypes.QueueEntry|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return null;
			
			// Check if user already in progress
			if(queue.inProgressEntries.some(e => e.user.id === user.id)) {
				return null;
			}

			// Remove from queue if present
			this.removeUserFromQueue(queueId, user.id);

			const entry:TwitchatDataTypes.QueueEntry = {
				id: Utils.getUUID(),
				user,
				joinedAt: Date.now(),
				note,
			};

			queue.inProgressEntries.push(entry);
			this.saveData();
			this.broadcastStates(queueId);

			return entry;
		},

		/**
		 * Draw a user from a queue
		 * @param queueId ID of the queue
		 * @param drawType Type of draw (first, specific user, random)
		 * @param userId Optional specific user ID to draw
		 * @param addToInProgress If true, automatically add the drawn user to the in-progress list
		 * @returns The drawn entry or null if none found
		 */
		drawUserFromQueue(queueId:string, drawType:"first"|"user"|"random", userId?:string, addToInProgress:boolean = false):TwitchatDataTypes.QueueEntry|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue || queue.queueEntries.length === 0) return null;

			let entry:TwitchatDataTypes.QueueEntry|undefined;

			switch(drawType) {
				case "first": {
					entry = queue.queueEntries[0];
					break;
				}
				case "user": {
					if(!userId) return null;
					entry = queue.queueEntries.find(e => e.user.id === userId);
					break;
				}
				case "random": {
					const randomIndex = Math.floor(Math.random() * queue.queueEntries.length);
					entry = queue.queueEntries[randomIndex];
					break;
				}
			}

			if(!entry) return null;

			// Remove from queue
			this.removeUserFromQueue(queueId, entry.user.id);

			// Add to in-progress if requested
			if(addToInProgress) {
				this.addUserToInProgress(queueId, entry.user, entry.note);
			}

			return entry;
		},

		/**
		 * Remove a user from a queue
		 * @param queueId ID of the queue
		 * @param userId ID of the user to remove
		 * @returns The removed entry or null if not found
		 */
		removeUserFromQueue(queueId:string, userId:string):TwitchatDataTypes.QueueEntry|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return null;

			const index = queue.queueEntries.findIndex(e => e.user.id === userId);
			if(index === -1) return null;

			const entry = queue.queueEntries[index];
			queue.queueEntries.splice(index, 1);
			this.saveData();
			this.broadcastStates(queueId);

			return entry;
		},

		/**
		 * Remove a user from the in-progress list
		 * @param queueId ID of the queue
		 * @param userId ID of the user to remove
		 * @returns The removed entry or null if not found
		 */
		removeUserFromInProgress(queueId:string, userId:string):TwitchatDataTypes.QueueEntry|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return null;

			const index = queue.inProgressEntries.findIndex(e => e.user.id === userId);
			if(index === -1) return null;

			const entry = queue.inProgressEntries[index];
			queue.inProgressEntries.splice(index, 1);
			this.saveData();
			this.broadcastStates(queueId);

			return entry;
		},

		/**
		 * Clear the waiting queue
		 * @param queueId ID of the queue
		 */
		clearQueue(queueId:string):void {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return;

			queue.queueEntries = [];
			this.saveData();
			this.broadcastStates(queueId);
		},

		/**
		 * Clear the in-progress list
		 * @param queueId ID of the queue
		 */
		clearInProgress(queueId:string):void {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return;

			queue.inProgressEntries = [];
			this.saveData();
			this.broadcastStates(queueId);
		},

		/**
		 * Get a user's position in the queue (1-indexed)
		 * @param queueId ID of the queue
		 * @param userId ID of the user
		 * @returns Position in queue (1-indexed) or -1 if not found
		 */
		getUserPositionInQueue(queueId:string, userId:string):number {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return -1;

			const index = queue.queueEntries.findIndex(e => e.user.id === userId);
			if(index === -1) return -1;

			return index + 1; // 1-indexed position
		},

		/**
		 * Check if a user is in the queue or in-progress
		 * @param queueId ID of the queue
		 * @param userId ID of the user
		 * @returns Location of the user or null if not found
		 */
		getUserLocation(queueId:string, userId:string):"queue"|"inProgress"|null {
			const queue = this.queueList.find(q => q.id === queueId);
			if(!queue) return null;

			if(queue.queueEntries.some(e => e.user.id === userId)) {
				return "queue";
			}

			if(queue.inProgressEntries.some(e => e.user.id === userId)) {
				return "inProgress";
			}

			return null;
		},

		saveData() {
			const data:IStoreData = {
				queueList: this.queueList,
			};
			DataStore.set(DataStore.QUEUES_CONFIGS, JSON.stringify(data));
		}
	} as IQueueActions
	& ThisType<IQueueActions
		& UnwrapRef<IQueueState>
		& _StoreWithState<"queue", IQueueState, IQueueGetters, IQueueActions>
		& _StoreWithGetters<IQueueGetters>
		& PiniaCustomProperties
	>,
});

interface IStoreData {
	queueList:TwitchatDataTypes.QueueData[];
}

// enable hot module replacement
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeQueue, import.meta.hot));
}
