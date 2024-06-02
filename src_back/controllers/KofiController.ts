
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import SSEController, { SSECode } from "./SSEController";
import Config from "../utils/Config";
import * as fs from "fs";
import Logger from "../utils/Logger";
import fetch from "node-fetch";

/**
* Created : 04/03/2024 
*/
export default class KofiController extends AbstractController {
	
	/**
	 * Kofi token to twitch user
	 */
	private hashmapCache:{[key:string]:{twitch:string}} = {};
	/**
	 * Twitch user to kofi token
	 */
	private hashmapInverseCache:{[key:string]:string} = {};
	
	/**
	 * Stores a merch item name
	 */
	private merchIdToNameCache:{[key:string]:string|false} = {};
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this.server.get('/api/kofi/token', async (request, response) => await this.getToken(request, response));
		this.server.post('/api/kofi/token', async (request, response) => await this.postToken(request, response));
		this.server.delete('/api/kofi/token', async (request, response) => await this.deleteToken(request, response));
		this.server.post('/api/kofi/webhook', async (request, response) => await this.postWebhook(request, response));

		if(!fs.existsSync(Config.KO_FI_USERS)) {
			fs.writeFileSync(Config.KO_FI_USERS, "{}", "utf-8");
		}else{
			this.hashmapCache = JSON.parse(fs.readFileSync(Config.KO_FI_USERS, "utf-8"));
		}

		this.hashmapInverseCache = {};
		for (const key in this.hashmapCache) {
			const v = this.hashmapCache[key];
			this.hashmapInverseCache[v.twitch] = key;
		}

		if(!fs.existsSync(Config.KO_FI_PRODUCT_CACHE)) {
			fs.writeFileSync(Config.KO_FI_PRODUCT_CACHE, "{}", "utf-8");
		}else{
			this.merchIdToNameCache = JSON.parse(fs.readFileSync(Config.KO_FI_PRODUCT_CACHE, "utf-8"));
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Called when receiving data from ko-fi
	 * @param request 
	 * @param response 
	 */
	private async postWebhook(request:FastifyRequest, response:FastifyReply) {
		try {
			const data = JSON.parse((request.body as any).data) as KofiData;
			const user = this.hashmapCache[data.verification_token];
			if(!user) return;

			if(data.shop_items) {
				let updateCache = false;
				//Ko-fi has no API to get a product name from its ID.
				//Only "solution" is to scrape it from the HTML page -_-...
				for (let i = 0; i < data.shop_items.length; i++) {
					const item = data.shop_items[i];

					//TODO remove that debug
					// if(i==0) item.direct_link_code = "07c48c41e7";
					// if(i==1) item.direct_link_code = "c0065f0775";

					//Product name already cached, load it from there
					if(this.merchIdToNameCache[item.direct_link_code] != undefined) {
						item.product_name = this.merchIdToNameCache[item.direct_link_code] || "";
					}else{
						//Attempt to load product name from page
						//These headers are necessary to bypass clouflare filtres
						const headers = {
							"Referrer": "https://ko-fi.com/keepitsimpelle/shop?ref=explore",
							"Host": "ko-fi.com",
							"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0",
							"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
							"Accept-Language": "en-US,en;q=0.5",
							"Accept-Encoding": "gzip, deflate",
							"Connection": "keep-alive",
							"Upgrade-Insecure-Requests": "1",
							"Sec-Fetch-Dest": "document",
							"Sec-Fetch-Mode": "navigate",
							"Sec-Fetch-Site": "none",
							"Sec-Fetch-User": "?1",
							"Cache-Control": "max-age=0",
						};
						const result = await fetch("https://ko-fi.com/s/"+item.direct_link_code, {method:"GET", headers});
						
						if(result.status == 200) {
							const html = await result.text();
							const productName = html.replace(/.*shop-item-title.*?>(.*?)<\/.*/gis, "$1");
							if(productName && productName.length > 0 && productName.length < 128) {
								Logger.info("Loaded ko-fi product #"+item.direct_link_code+":", productName);
								this.merchIdToNameCache[item.direct_link_code] = productName;
								item.product_name = productName;
							}else{
								//Flag cache as failed. Avoids to keep requesting for it later
								this.merchIdToNameCache[item.direct_link_code] = false;
							}
						}else{
							//Flag cache as failed. Avoids to keep requesting for it later
							this.merchIdToNameCache[item.direct_link_code] = false;
						}
						updateCache = true;
					}
				}
				if(updateCache) {
					fs.writeFileSync(Config.KO_FI_PRODUCT_CACHE, JSON.stringify(this.merchIdToNameCache), "utf-8");
				}
			}

			SSEController.sendToUser(user.twitch, SSECode.KO_FI_EVENT, data);
		}catch(error) {
			Logger.error("Failed parsing kofi event");
			console.log(error);
		}
	
		response.header('Content-Type', 'application/json')
		.status(200)
		.send("ok");
	}

	/**
	 * Called when requesting to get current token
	 * @param request 
	 * @param response 
	 */
	private async getToken(request:FastifyRequest, response:FastifyReply) {
		const guard = await super.twitchUserGuard(request, response);
		if(guard === false) return;

		try {
			const token = this.hashmapInverseCache[guard.user_id];

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:token != undefined, token}));
		}catch(error) {
			Logger.error("Failed getting kofi token");
			console.log(error);
			
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false}));
		}
	}

	/**
	 * Called when requesting to set current token
	 * @param request 
	 * @param response 
	 */
	private async postToken(request:FastifyRequest, response:FastifyReply) {
		const guard = await super.twitchUserGuard(request, response);
		if(guard === false) return;

		const token = (request.body as any).token;

		try {
			this.hashmapCache[token] = {twitch:guard.user_id};
			this.hashmapInverseCache[guard.user_id] = token;
	
			fs.writeFileSync(Config.KO_FI_USERS, JSON.stringify(this.hashmapCache), "utf-8");
	
			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:true}));
		}catch(error) {
			Logger.error("Failed setting kofi token");
			console.log(error);

			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false}));
		}
	}

	/**
	 * Called when requesting to delete current token
	 * @param request 
	 * @param response 
	 */
	private async deleteToken(request:FastifyRequest, response:FastifyReply) {
		const guard = await super.twitchUserGuard(request, response);
		if(guard === false) return;
		try {
			const token = this.hashmapInverseCache[guard.user_id];
			delete this.hashmapCache[token];
			delete this.hashmapInverseCache[guard.user_id];
			fs.writeFileSync(Config.KO_FI_USERS, JSON.stringify(this.hashmapCache), "utf-8");

			response.header('Content-Type', 'application/json')
			.status(200)
			.send(JSON.stringify({success:true}));

		}catch(error) {
			Logger.error("Failed deleting kofi token");
			console.log(error);
			
			response.header('Content-Type', 'application/json')
			.status(500)
			.send(JSON.stringify({success:false}));
		}
	}

}

interface KofiData {
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
		//Custom prop added after loading/parsing related product page.
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