<template>
	<div class="overlayqueue overlayParamsSection">
		<section class="queueList">
			<ToggleBlock v-for="entry in $store.queues.queueList"
			:title="entry.title"
			:titleDefault="$t('overlay.labels.default_title')"
			:titleMaxLengh="30"
			:open="false"
			:key="entry.id">
				<template #left_actions>
					<Icon name="queue" class="queueTypeIcon" />
				</template>

				<div class="content">
					<div class="info" v-if="entry.isDefault">
						<Icon name="info" />
						<i18n-t scope="global" tag="span" keypath="overlay.queue.default_queue">
							<template #CMD><mark>/queue...</mark></template>
						</i18n-t>
					</div>

					<div class="card-item install">
						<label><Icon name="obs" />{{$t('bingo_grid.form.install_title')}}</label>
						<OverlayInstaller type="queue" :sourceSuffix="entry.title" :id="entry.isDefault? '' : entry.id" :sourceTransform="{width:300, height:100}" />
					</div>

					<ParamItem :paramData="param_orientation[entry.id]" v-model="entry.overlayParams.orientation" class="selectList" @change="onChange(entry)" />
					<ParamItem :paramData="param_displayMode[entry.id]" v-model="entry.overlayParams.displayMode" class="selectList" @change="onChange(entry)" />
					<ParamItem :paramData="param_scrolling[entry.id]" v-model="entry.overlayParams.scrolling" @change="onChange(entry)" />
					<ParamItem :paramData="param_showIcon[entry.id]" v-model="entry.overlayParams.showIcon" @change="onChange(entry)" />
					<ParamItem :paramData="param_bgEnabled[entry.id]" v-model="entry.overlayParams.bgEnabled" @change="onChange(entry)">
						<ParamItem :paramData="param_bgColor[entry.id]" v-model="entry.overlayParams.bgColor" :childLevel="1" noBackground @change="onChange(entry)" />
					</ParamItem>
					<ParamItem :paramData="param_textFont[entry.id]" v-model="entry.overlayParams.textFont" class="selectList" @change="onChange(entry)" />
					<ParamItem :paramData="param_textSize[entry.id]" v-model="entry.overlayParams.textSize" @change="onChange(entry)" />
					<ParamItem :paramData="param_textColor[entry.id]" v-model="entry.overlayParams.textColor" @change="onChange(entry)" />
				</div>
			</ToggleBlock>
		</section>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import TTButton from '../../../TTButton.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayInstaller from './OverlayInstaller.vue';
import Icon from '@/components/Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		ToggleBlock,
		OverlayInstaller,
	}
})

class OverlayParamsQueue extends Vue {
	public param_orientation:{[key:string]:TwitchatDataTypes.ParameterData<string, TwitchatDataTypes.QueueOverlayParams["orientation"]>} = {};
	public param_displayMode:{[key:string]:TwitchatDataTypes.ParameterData<string, TwitchatDataTypes.QueueOverlayParams["displayMode"]>} = {};
	public param_scrolling:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_bgColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_bgEnabled:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};
	public param_textFont:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_textSize:{[key:string]:TwitchatDataTypes.ParameterData<number>} = {};
	public param_textColor:{[key:string]:TwitchatDataTypes.ParameterData<string>} = {};
	public param_showIcon:{[key:string]:TwitchatDataTypes.ParameterData<boolean>} = {};

	public beforeMount():void {
		this.initParams();
	}

	/**
	 * Create parameters for a queue entry
	 */
	private initParams():void {
		this.$store.queues.queueList.forEach(entry=> {
			const id = entry.id;
			if(this.param_orientation[id]) return;
			
			const orientationList:TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.QueueOverlayParams["orientation"]>[] = [
				{value:"vertical", labelKey:"overlay.queue.param_orientation_vertical"}, 
				{value:"horizontal", labelKey:"overlay.queue.param_orientation_horizontal"}
			];
			
			const displayModeList:TwitchatDataTypes.ParameterDataListValue<TwitchatDataTypes.QueueOverlayParams["displayMode"]>[] = [
				{value:"queue", labelKey:"overlay.queue.param_displaymode_queue"}, 
				{value:"inProgress", labelKey:"overlay.queue.param_displaymode_inprogress"},
				{value:"alternating", labelKey:"overlay.queue.param_displaymode_alternating"}
			];
			
			this.param_orientation[id] = {type:"list", value:"vertical", labelKey:"overlay.queue.param_orientation", icon:"orientation", listValues:orientationList};
			this.param_displayMode[id] = {type:"list", value:"queue", labelKey:"overlay.queue.param_displaymode", icon:"displayMode", listValues:displayModeList};
			this.param_scrolling[id] = {type:"boolean", value:true, labelKey:"overlay.queue.param_scrolling", icon:"scroll"};
			this.param_bgColor[id] = {type:"color", value:"", labelKey:"overlay.queue.param_bgColor", icon:"color"};
			this.param_showIcon[id] = {type:"boolean", value:true, labelKey:"overlay.queue.param_showIcon", icon:"user"};
			this.param_bgEnabled[id] = {type:"boolean", value:true, labelKey:"overlay.queue.param_bgEnabled", icon:"overlay"};
			this.param_textFont[id] = {type:"font", value:"", labelKey:"overlay.queue.param_textFont", icon:"font"};
			this.param_textSize[id] = {type:"number", value:20, labelKey:"overlay.queue.param_textSize", icon:"fontSize"};
			this.param_textColor[id] = {type:"color", value:"", labelKey:"overlay.queue.param_textColor", icon:"color"};
		});
	}

	public onChange(entry:TwitchatDataTypes.QueueData):void {
		this.$store.queues.saveData();
		this.$store.queues.broadcastStates(entry.id);
	}

}
export default toNative(OverlayParamsQueue);
</script>

<style scoped lang="less">
.overlayqueue{
	.actions{
		margin: auto;
		display: flex;
		flex-direction: row;
		justify-content: center;
		flex-wrap: wrap;
		gap: 1em;
	}

	.install {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		.icon {
			height: 1em;
		}
		label {
			gap: .5em;
			display: flex;
			flex-direction: row;
			align-items: center;
		}
	}

	.content {
		gap: .25em;
		display: flex;
		flex-direction: column;
		.info{
			text-align: center;
			font-size: .8em;
			margin-bottom: .25em;
			.icon {
				height: 1em;
				margin-right: .5em;
			}
		}
	}

	.selectList {
		:deep(select),
		:deep(.v-select) {
			flex-basis: 200px !important;
		}
	}
}
</style>
