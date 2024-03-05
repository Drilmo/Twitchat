import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IKofiActions, IKofiGetters, IKofiState } from '../StoreProxy';
import ApiHelper from '@/utils/ApiHelper';
import StoreProxy from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';


export const storeKofi = defineStore('kofi', {
	state: () => ({
		webhooktoken:"",
		connected:false,
	} as IKofiState),



	getters: {
		
	} as IKofiGetters
	& ThisType<UnwrapRef<IKofiState> & _StoreWithGetters<IKofiGetters> & PiniaCustomProperties>
	& _GettersTree<IKofiState>,



	actions: {
		async populateData():Promise<void> {
			const data = DataStore.get(DataStore.KOFI);
			ApiHelper.call("kofi/token", "GET", undefined, false).then(result =>{
				if(result.json.token) {
					this.webhooktoken = result.json.token;
					this.connected = true;
				}
			});
		},

		async connect(token:string):Promise<boolean> {
			this.connected = false;
			this.webhooktoken = token;
			const result = await ApiHelper.call("kofi/token", "POST", {token:this.webhooktoken}, false);
			if(result.json.success) {
				this.connected = true;
				return true;
			}
			return false;
		},

		async disconnect():Promise<boolean> {
			this.connected = false;
			this.webhooktoken = "";
			const result = await ApiHelper.call("kofi/token", "DELETE", undefined, false);
			if(result.json.success) {
				this.connected = false;
				return true
			}
			return false;
		},

		onEvent(data:KofiEventData):void {
			const me = StoreProxy.auth.twitch.user;
			switch(data.type) {
				case "Donation": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiDonationData = {
						id:Utils.getUUID(),
						eventType:"donation",
						platform:"twitchat",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
					}
					StoreProxy.chat.addMessage(message);
					break;
				}
				
				case "Subscription": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiSubscriptionData = {
						id:Utils.getUUID(),
						eventType:"subscription",
						platform:"twitchat",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						tier:data.tier_name,
						firstTimeSub:data.is_first_subscription_payment == true,
					}
					StoreProxy.chat.addMessage(message);
					break;
				}
				
				case "Shop Order": {
					const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
					const message:TwitchatDataTypes.KofiMerchData = {
						id:Utils.getUUID(),
						eventType:"merch",
						platform:"twitchat",
						channel_id:me.id,
						isPublic:data.is_public == true,
						type:TwitchatDataTypes.TwitchatMessageType.KOFI,
						date:Date.now(),
						userName:data.from_name,
						amount:parseFloat(data.amount),
						amountFormatted:data.amount,
						currency:data.currency,
						message:data.message,
						message_chunks: chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						products:(data.shop_items || []).map(item=>{
							return {
								id:item.direct_link_code,
								name:item.product_name,
								quantity:item.quantity,
							}
						})
					}
					StoreProxy.chat.addMessage(message);
					break;
				}
			}
		}
	
	} as IKofiActions
	& ThisType<IKofiActions
		& UnwrapRef<IKofiState>
		& _StoreWithState<"raffle", IKofiState, IKofiGetters, IKofiActions>
		& _StoreWithGetters<IKofiGetters>
		& PiniaCustomProperties
	>,
})

interface KofiEventData {
	verification_token: string;
	message_id: string;
	timestamp: string;
	type: "Donation" | "Subscription" | "Shop Order";
	is_public: boolean;
	from_name: string;
	message: string;
	amount: string;
	url: string;
	email: string;
	currency: string;
	is_subscription_payment: boolean;
	is_first_subscription_payment: boolean;
	kofi_transaction_id: string;
	shop_items?: {
		direct_link_code: string;
		variation_name: string;
		quantity: number;
		//Unoffical tag.
		//It's populated from my backend after attempting to
		//scrape the product page
		product_name?: string;
	}[];
	tier_name?: string;
	shipping?: {
		full_name: string;
		street_address: string;
		city: string;
		state_or_province: string;
		postal_code: string;
		country: string;
		country_code: string;
		telephone: string;
	};
}