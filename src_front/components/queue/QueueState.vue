<template>
	<div class="queuestate" v-if="activeQueues.length > 0" v-show="showList || !collapsible">
		<div class="header" @click="toggleList()" :class="{ clickable: collapsible }">
			<div class="title">
				<h1>{{ $t("queue.default_title") }} <span class="count" v-if="totalCount > 0">({{ totalCount }})</span></h1>
			</div>
		</div>
		<div class="messageList" v-if="showList || !collapsible">
			<div v-for="queue in activeQueues" :key="queue.id" class="queue-item">
				<div class="queue-header">
					<Icon name="list" class="icon" />
					<span class="title">{{ queue.title || $t('queue.default_title') }}</span>
					<span class="status" v-if="queue.paused">({{ $t('queue.paused') }})</span>
				</div>
				
				<div class="columns-container">
					<!-- Queue entries column -->
					<div class="column entries" v-if="queue.entries.length > 0 || (queue.entries.length === 0 && (!queue.inProgress || queue.inProgress.length === 0))">
						<div class="section-title">{{ $t('queue.form.list_entries') }} <span class="count">({{ queue.entries.length }})</span></div>
						<div class="user-list" v-if="queue.entries.length > 0">
							<div v-for="(entry, index) in queue.entries" :key="entry.user.id" class="messageListItem user-entry">
								<span class="position">{{ index + 1 }}.</span>
								<Icon :name="entry.user.platform" class="platform-icon" />
								<img :src="entry.user.avatarPath" class="avatar" v-if="entry.user.avatarPath" />
								<span class="username">{{ entry.user.displayName }}</span>
								<div class="actions">
									<button class="actionBt" @click="moveUp(queue.id, entry.user.id, index)" v-if="index > 0" v-tooltip="$t('queue.form.move_up_tt')">
										<Icon name="arrowDown" class="icon up" />
									</button>
									<button class="actionBt" @click="moveDown(queue.id, entry.user.id, index)" v-if="index < queue.entries.length - 1" v-tooltip="$t('queue.form.move_down_tt')">
										<Icon name="arrowDown" class="icon" />
									</button>
									<button class="actionBt" @click="moveToInProgress(queue.id, entry.user.id)" v-if="queue.inProgressEnabled" v-tooltip="$t('queue.form.move_to_progress_tt')">
										<Icon name="next" class="icon" />
									</button>
									<button class="actionBt delete" @click="removeViewer(queue.id, entry.user.id)" v-tooltip="$t('queue.form.remove_viewer_tt')">
										<Icon name="trash" class="icon" />
									</button>
								</div>
							</div>
						</div>
						<!-- Empty state -->
						<div class="empty" v-if="queue.entries.length === 0">
							{{ $t('queue.empty') }}
						</div>
					</div>
					
					<!-- In progress entries column -->
					<div class="column in-progress" v-if="queue.inProgressEnabled && queue.inProgress && queue.inProgress.length > 0">
						<div class="section-title">{{ $t('queue.form.list_in_progress') }} <span class="count">({{ queue.inProgress.length }})</span></div>
						<div class="user-list">
							<div v-for="entry in queue.inProgress" :key="entry.user.id" class="messageListItem user-entry in-progress">
								<Icon :name="entry.user.platform" class="platform-icon" />
								<img :src="entry.user.avatarPath" class="avatar" v-if="entry.user.avatarPath" />
								<span class="username">{{ entry.user.displayName }}</span>
								<div class="actions">
									<button class="actionBt" @click="moveToQueue(queue.id, entry.user.id)" v-tooltip="$t('queue.form.move_back_to_queue_tt')">
										<Icon name="prev" class="icon" />
									</button>
									<button class="actionBt delete" @click="removeViewer(queue.id, entry.user.id)" v-tooltip="$t('queue.form.remove_viewer_tt')">
										<Icon name="trash" class="icon" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Vue, toNative, Prop } from 'vue-facing-decorator';

@Component({
	components:{
		Icon,
	}
})
class QueueState extends Vue {

	@Prop()
	public queueIds?: string[];

	@Prop({ default: true })
	public collapsible!: boolean;

	public showList: boolean = true;

	public get activeQueues():TwitchatDataTypes.QueueData[] {
		// Filter by enabled queues and optionally by specific queue IDs
		return this.$store.queue.queueList.filter(q => {
			if(!q.enabled) return false;
			if(this.queueIds && this.queueIds.length > 0) {
				return this.queueIds.includes(q.id);
			}
			return true;
		});
	}

	public get totalCount():number {
		return this.activeQueues.reduce((total, queue) => {
			const queueCount = queue.entries.length;
			const inProgressCount = queue.inProgressEnabled && queue.inProgress ? queue.inProgress.length : 0;
			return total + queueCount + inProgressCount;
		}, 0);
	}

	public toggleList():void {
		if (this.collapsible) {
			this.showList = !this.showList;
		}
	}

	public moveUp(queueId:string, userId:string, index:number):void {
		const queue = this.activeQueues.find(q => q.id === queueId);
		if(!queue || index <= 0) return;
		const entry = queue.entries[index];
		queue.entries.splice(index, 1);
		queue.entries.splice(index - 1, 0, entry);
		this.$store.queue.saveData();
	}

	public moveDown(queueId:string, userId:string, index:number):void {
		const queue = this.activeQueues.find(q => q.id === queueId);
		if(!queue || index >= queue.entries.length - 1) return;
		const entry = queue.entries[index];
		queue.entries.splice(index, 1);
		queue.entries.splice(index + 1, 0, entry);
		this.$store.queue.saveData();
	}

	public moveToInProgress(queueId:string, userId:string):void {
		this.$store.queue.moveToInProgress(queueId, userId);
	}

	public moveToQueue(queueId:string, userId:string):void {
		const queue = this.activeQueues.find(q => q.id === queueId);
		if(!queue || !queue.inProgress) return;
		const entry = queue.inProgress.find(e => e.user.id === userId);
		if(!entry) return;
		queue.inProgress = queue.inProgress.filter(e => e.user.id !== userId);
		queue.entries.push(entry);
		this.$store.queue.saveData();
	}

	public removeViewer(queueId:string, userId:string):void {
		this.$store.queue.removeViewer(queueId, userId);
	}

}
export default toNative(QueueState);
</script>

<style scoped lang="less">
.queuestate{
	background-color: var(--background-color-secondary);
	display: flex;
	flex-direction: column;
	min-height: 100px;
	z-index: 1;
	position: relative;
	margin-bottom: .5em;
	overflow: visible;

	.header {
		background-color: var(--color-primary);
		padding: .5em 0;
		flex-shrink: 0;
		&.clickable {
			cursor: pointer;
		}
		.title {
			display: flex;
			flex-direction: row;
			justify-content: center;
			color: var(--color-light);
			h1 {
				text-align: center;
				margin: 0 10px;
				font-size: 1em;

				.count {
					font-size: .65em;
					font-weight: normal;
				}
			}
		}
	}

	.messageList {
		flex-grow: 1;
		background-color: var(--background-color-primary);
		border: 2px solid var(--color-primary);
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: 0 2px 2px 0 rgba(0,0,0,0.5);
		padding: .5em;
		overflow: visible;
		
		.queue-item {
			padding: 0;
			
			&:not(:last-child) {
				margin-bottom: 1em;
			}
			
			.queue-header {
				display: flex;
				align-items: center;
				gap: .5em;
				margin-bottom: .75em;
				padding: .5em;
				background-color: var(--color-primary-fader);
				border-radius: var(--border-radius);
				color: var(--color-text);
				font-weight: bold;
				
				.icon {
					width: 1em;
					height: 1em;
					filter: brightness(0) invert(1);
					opacity: 0.8;
				}
				
				.title {
					flex-grow: 1;
					font-size: 1.1em;
				}
				
				.status {
					font-size: .8em;
					font-style: italic;
					opacity: .7;
					font-weight: normal;
				}
			}
			
			.columns-container {
				display: flex;
				gap: 1em;
				align-items: flex-start;
				
				.column {
					flex: 1;
					min-width: 0;
					
					&.entries {
						border-right: 1px solid var(--color-dark-fadest);
						padding-right: 1em;
					}
					
					&.in-progress {
						padding-left: 1em;
					}
				}
			}
			
			.section-title {
				font-size: .9em;
				font-weight: bold;
				margin-bottom: .5em;
				opacity: .8;
				color: var(--color-text);
				
				.count {
					font-size: .8em;
					font-weight: normal;
					opacity: .7;
				}
			}
			
			.user-list {
				display: flex;
				flex-direction: column;
				gap: 2px;
				overflow: visible;
			}
			
			.messageListItem {
				cursor: default;
				overflow: visible;
				font-family: var(--font-inter);
				transition: background-color .25s;
				margin: 0;
				padding: .3em .5em;
				display: flex;
				align-items: center;
				gap: .4em;
				position: relative;
				
				&:last-child {
					margin-bottom: .5em;
				}

				&:nth-child(odd) {
					background-color: fade(#ffffff, 5%);
				}
				
				&.in-progress {
					background-color: var(--color-secondary-fadest);
					&:nth-child(odd) {
						background-color: var(--color-secondary-fadest);
					}
				}

				&:hover {
					.actions {
						opacity: 1;
					}
				}
				
				.actions:hover {
					opacity: 1;
				}
				
				.position {
					font-size: .8em;
					opacity: .6;
					min-width: 1.5em;
					color: var(--color-text);
				}
				
				.platform-icon {
					width: 1em;
					height: 1em;
					flex-shrink: 0;
					filter: brightness(0) invert(1);
					opacity: 0.8;
				}
				
				.avatar {
					width: 1.5em;
					height: 1.5em;
					border-radius: 50%;
					flex-shrink: 0;
				}
				
				.username {
					font-size: .95em;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					color: var(--color-text);
					flex-grow: 1;
				}

				.actions {
					display: flex;
					gap: .25em;
					opacity: 0;
					transition: opacity .2s ease;
					position: relative;
					z-index: 10;
					
					.actionBt {
						padding: .2em;
						border-radius: .25em;
						background-color: var(--color-primary-fader);
						border: none;
						cursor: pointer;
						transition: background-color .25s;
						display: flex;
						align-items: center;
						justify-content: center;
						
						&:hover {
							background-color: var(--color-primary-fade);
						}
						
						&.delete {
							background-color: var(--color-alert-fader);
							
							&:hover {
								background-color: var(--color-alert-fade);
							}
						}
						
						.icon {
							width: .8em;
							height: .8em;
							filter: brightness(0) invert(1);
							
							&.up {
								transform: rotate(180deg);
							}
						}
					}
				}
			}
			
			.empty {
				text-align: center;
				font-style: italic;
				opacity: .6;
				font-size: .9em;
				padding: .5em;
				color: var(--color-text);
			}
		}
	}
}
</style>