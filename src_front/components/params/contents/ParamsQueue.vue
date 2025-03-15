<template>
	<div class="paramsqueue parameterContent">
		<Icon name="queue" class="icon" v-if="panelContext == false" />

		<div class="head" v-if="panelContext == false">
			<i18n-t scope="global" tag="p" keypath="queues.header">
				<template #LINK_TRIGGER>
					<a @click="openTriggers()" target="_blank">{{ $t("queues.header_link_trigger") }}</a>
				</template>
				<template #LINK_OVERLAY>
					<a @click="openOverlays()" target="_blank">{{ $t("queues.header_link_overlay") }}</a>
				</template>
			</i18n-t>
		</div>

		<section>
			<TTButton icon="add" v-if="canCreateQueues" @click="$store.queues.createQueue(); buildParams()">{{ $t('queues.addBt') }}</TTButton>
			<div class="card-item premium premiumLimit" v-else>
				<span>{{$t("queues.premium_limit", {MAX:$config.MAX_QUEUES, MAX_PREMIUM:$config.MAX_QUEUES_PREMIUM})}}</span>
				<TTButton icon="premium" premium light @click="openPremium()">{{ $t("premium.become_premiumBt") }}</TTButton>
			</div>
		</section>

		<draggable class="entryList"
		v-model="$store.queues.queueList"
		direction="vertical"
		group="queues"
		item-key="id"
		:animation="250"
		@sort="rebuildParams()">
			<template #item="{element:entry, index}:{element:TwitchatDataTypes.QueueData, index:number}">
				<ToggleBlock class="queueEntry"
				:open="false" noArrow
				:key="entry.id"
				:editableTitle="!entry.isDefault"
				v-model:title="entry.title"
				titleDefault="..."
				:titleMaxLengh="50"
				@update:title="$store.queues.saveData()">
					<template #left_actions>
						<Icon name="queue" class="queueTypeIcon" />
						<div class="queueInfo">
							<span class="queueCount">{{ entry.queueEntries.length }}</span>
							<span class="queueLabel">{{ $t('queues.queue_count') }}</span>
						</div>
						<div class="queueInfo">
							<span class="inProgressCount">{{ entry.inProgressEntries.length }}</span>
							<span class="inProgressLabel">{{ $t('queues.inprogress_count') }}</span>
						</div>
					</template>

					<template #right_actions>
						<div class="actions" v-if="!entry.isDefault">
							<ToggleButton v-model="entry.enabled"
							@change="$store.queues.saveData()"
							@click.stop />
							<TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
							<TTButton class="actionBt" alert icon="trash" @click.stop="$store.queues.deleteQueue(entry.id)" />
						</div>
						<div class="actions" v-else>
							<TTButton class="actionBt" @click.stop :copy="entry.id" icon="id" v-tooltip="$t('global.copy_id')" small />
						</div>
					</template>

					<div class="content">
						<div class="info" v-if="entry.isDefault">
							<Icon name="info" />
							<i18n-t scope="global" tag="span" keypath="queues.panel.hint_queue">
								<template #CMD><mark>/queue...</mark></template>
							</i18n-t>
						</div>

						<div class="ctas">
							<TTButton icon="eraser" @click="clearQueue(entry.id)">{{ $t('queues.clear_queue') }}</TTButton>
							<TTButton icon="eraser" @click="clearInProgress(entry.id)">{{ $t('queues.clear_inprogress') }}</TTButton>
						</div>

						<div class="card-item placeholder"
						:class="{error:queue2PlaceholderError[entry.id]}"
						v-tooltip="$t('queues.form.param_placeholder_tt')">
							<Icon name="placeholder"/>
							<span class="label">{{ $t("queues.form.param_placeholder") }}</span>
							<PlaceholderField class="field"
								v-model="entry.placeholderKey"
								prefix="QUEUE_"
								@change="checkForPlaceholderDuplicates()" />
							<template v-if="queue2PlaceholderError[entry.id]">
								<div class="errorReason" v-if="defaultQueuePlaceholder === entry.placeholderKey">{{ $t("queues.form.param_placeholder_default_conflict") }}</div>
								<div class="errorReason" v-else>{{ $t("queues.form.param_placeholder_conflict") }}</div>
							</template>
						</div>
					</div>
				</ToggleBlock>
			</template>
		</draggable>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import PlaceholderField from '@/components/PlaceholderField.vue';
import TTButton from '@/components/TTButton.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import ToggleButton from '@/components/ToggleButton.vue';
import StoreProxy from '@/store/StoreProxy';
import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative, Vue } from 'vue-facing-decorator';
import draggable from 'vuedraggable';
import type IParameterContent from './IParameterContent';

@Component({
	components:{
		Icon,
		TTButton,
		draggable,
		ToggleBlock,
		ToggleButton,
		PlaceholderField,
	},
	emits:[]
})
class ParamsQueue extends Vue implements IParameterContent {

	@Prop({type:Boolean, default:false})
	public panelContext!:boolean;

	public queue2PlaceholderError:Record<string, boolean> = {};
	public defaultQueuePlaceholder = "";

	public get canCreateQueues():boolean {
		if(this.$store.auth.isPremium) return true;
		const count = this.$store.queues.queueList.filter(v=>v.enabled != false).length;
		return count < this.$config.MAX_QUEUES;
	}

	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}

	public openOverlays():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "queue");
	}

	public mounted(): void {
		this.defaultQueuePlaceholder = this.$store.queues.queueList.find(v=>v.isDefault)?.placeholderKey || '';
		this.buildParams();
	}

	public onNavigateBack(): boolean { return false; }

	/**
	 * Opens the premium page
	 */
	public openPremium():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
	}

	/**
	 * Clear the queue
	 */
	public clearQueue(id:string):void {
		if(!confirm(this.$t('queues.confirm_clear_queue') as string)) return;
		this.$store.queues.clearQueue(id);
	}

	/**
	 * Clear the in-progress list
	 */
	public clearInProgress(id:string):void {
		if(!confirm(this.$t('queues.confirm_clear_inprogress') as string)) return;
		this.$store.queues.clearInProgress(id);
	}

	/**
	 * Builds up local queue list
	 */
	public buildParams():void {
		for (let i = 0; i < this.$store.queues.queueList.length; i++) {
			const element = this.$store.queues.queueList[i];
			this.queue2PlaceholderError[element.id] = false;
		}
		this.checkForPlaceholderDuplicates();
	}

	/**
	 * Updates params when list is reordered
	 */
	public rebuildParams():void {
		this.$store.queues.saveData();
	}

	/**
	 * Make sure the placeholder of each timer is unique.
	 * Check if there's conflicts
	 */
	public checkForPlaceholderDuplicates():void {
		const placeholders:Record<string, string[]> = {};
		for (let i = 0; i < this.$store.queues.queueList.length; i++) {
			const element = this.$store.queues.queueList[i];
			if(element.placeholderKey) {
				if(!placeholders[element.placeholderKey]) placeholders[element.placeholderKey] = [];
				placeholders[element.placeholderKey].push(element.id);
			}
		}
		
		for (const key in this.queue2PlaceholderError) {
			this.queue2PlaceholderError[key] = false;
		}

		for (const key in placeholders) {
			if(placeholders[key].length > 1) {
				for (let i = 0; i < placeholders[key].length; i++) {
					this.queue2PlaceholderError[placeholders[key][i]] = true;
				}
			}
		}

		rebuildPlaceholdersCache();
	}
}

export default toNative(ParamsQueue);
</script>

<style scoped lang="less">
.paramsqueue{
	position:relative;
	a{
		text-decoration: underline;
		cursor: pointer;
	}
	>.icon{
		position: absolute;
		font-size: 15em;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		opacity: .1;
		pointer-events: none;
	}
	
	.head{
		text-align: center;
		margin-bottom: 2em;
	}

	section{
		display: flex;
		justify-content: center;
		gap: 1em;
		margin-bottom: 1em;
		position: relative;
		z-index: 1;
	}

	.premiumLimit{
		margin: auto;
		span{
			display: block;
			margin-bottom: 1em;
		}
	}

	.entryList{
		.queueEntry{
			position: relative;
			z-index: 1;
			.info{
				display: flex;
				margin-bottom:1em;
				align-items: center;
				col-gap: .25em;
				gap: .25em;
			}

			.queueTypeIcon{
				margin-right: .5em;
			}

			.queueInfo{
				margin-right: 1em;
				display: flex;
				flex-direction: column;
			}

			.queueCount, .inProgressCount{
				font-size: 1.2em;
				font-weight: bold;
			}

			.content{
				display: flex;
				flex-direction: column;
				row-gap: 1em;
				gap: 1em;
			}

			.ctas{
				display: flex;
				flex-wrap: wrap;
				gap: .5em;
				margin-bottom: 0;
			}

			.placeholder{
				.errorReason{
					margin-top: .5em;
					color: var(--color-error);
				}
			}

			+ .queueEntry{
				margin-top: .5em;
			}
		}
	}
}
</style>
