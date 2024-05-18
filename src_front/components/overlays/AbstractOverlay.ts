import TwitchatEvent from '@/events/TwitchatEvent';
import PublicAPI from '@/utils/PublicAPI';
import { ComponentBase, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractOverlay"
})
export default class AbstractOverlay extends Vue {

	private initDone:boolean = false;
	private publicAPIConnectedHandler!:() => void;

	public mounted():void {
		this.requestInfo();
		this.publicAPIConnectedHandler = () => {
			if(!this.initDone) this.requestInfo();
			this.initDone = true;//Avoids potential double init. Once when BroadcastChannel is ready and once when OBS-websocket is ready
		}
		PublicAPI.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.publicAPIConnectedHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.TWITCHAT_READY, this.publicAPIConnectedHandler);
	}

	public beforeUnmount():void {
		PublicAPI.instance.removeEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.publicAPIConnectedHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.TWITCHAT_READY, this.publicAPIConnectedHandler);
	}

	/**
	 * Called on loading or when OBS-websocket connection is established
	 * Override this and request for any info (current music, a counter's data, ...)
	 */
	public requestInfo():void {}
}
