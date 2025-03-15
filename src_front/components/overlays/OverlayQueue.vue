<template>
	<div class="overlay-queue" :class="[data.orientation, {scrolling:data.scrolling}]">
		<div ref="containerRef" class="container" :style="containerStyle">
			<div ref="contentRef" class="content" :style="contentStyle">
				<template v-for="item in displayedItems" :key="item.id">
					<div class="queue-item" :style="itemStyle" v-if="item.user">
						<div class="icon" v-if="data.showIcon">
							<img v-if="item.user.avatar" :src="item.user.avatar">
							<Icon name="user" v-else/>
						</div>
						<div class="user-info">
							<div class="user-name" :style="{fontSize:data.textSize+'px'}">{{ item.user.displayName }}</div>
							<div class="user-note" v-if="item.note">{{ item.note }}</div>
						</div>
						<template v-if="displayMode == 'queue'">
							<div class="position">{{ getPosition(item) }}</div>
						</template>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TwitchatEvent, TwitchatEventType } from '@/utils/TwitchatEvent';
import type { CSSProperties } from 'vue';
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import gsap from 'gsap';

type DisplayMode = 'queue' | 'inProgress' | 'alternating';

export default defineComponent({
	props: {
		id: { type: String, required: true },
	},
	components: {
		Icon,
	},
	setup(props) {
		const containerRef = ref<HTMLElement | null>(null);
		const contentRef = ref<HTMLElement | null>(null);
		const queueData = ref<TwitchatDataTypes.QueueData | null>(null);
		const data = ref<TwitchatDataTypes.QueueOverlayParams | null>(null);
		const displayedItems = ref<TwitchatDataTypes.QueueEntry[]>([]);
		const displayMode = ref<DisplayMode>('queue');
		const alternateInterval = ref<number>(-1);
		const tween = ref<gsap.core.Tween | null>(null);

		const containerStyle = computed(() => {
			const style:CSSProperties = {};
			if (!data.value) return style;

			if(data.value.bgEnabled) {
				style.background = data.value.bgColor;
			}

			return style;
		});

		const contentStyle = computed(() => {
			const style:CSSProperties = {};
			if (!data.value) return style;

			style.fontFamily = data.value.textFont;
			style.color = data.value.textColor;

			return style;
		});

		const itemStyle = computed(() => {
			const style:CSSProperties = {};
			if (!data.value) return style;

			style.fontSize = data.value.textSize + 'px';

			return style;
		});

		const getPosition = (item: TwitchatDataTypes.QueueEntry): number => {
			if (!queueData.value || displayMode.value !== 'queue') return 0;
			const index = queueData.value.queueEntries.findIndex(entry => entry.id === item.id);
			return index >= 0 ? index + 1 : 0; // 1-indexed position
		};

		const updateDisplayedItems = () => {
			if (!queueData.value) return;

			switch (displayMode.value) {
				case 'queue':
					displayedItems.value = [...queueData.value.queueEntries];
					break;
				case 'inProgress':
					displayedItems.value = [...queueData.value.inProgressEntries];
					break;
			}
		};

		const toggleAlternate = () => {
			if (!data.value || !queueData.value) return;
			if (data.value.displayMode !== 'alternating') return;

			displayMode.value = displayMode.value === 'queue' ? 'inProgress' : 'queue';
			updateDisplayedItems();
		};

		const startScrollAnimation = () => {
			if (!data.value?.scrolling || !containerRef.value || !contentRef.value) return;

			// Stop any existing animation
			if (tween.value) {
				tween.value.kill();
				tween.value = null;
			}

			const containerHeight = containerRef.value.offsetHeight;
			const contentHeight = contentRef.value.scrollHeight;

			// Only animate if content is larger than container
			if (contentHeight <= containerHeight) return;

			const duration = Math.max(5, contentHeight / 50); // Adjust speed based on content length

			gsap.set(contentRef.value, { y: 0 });

			tween.value = gsap.to(contentRef.value, {
				y: -(contentHeight - containerHeight),
				duration,
				ease: 'none',
				repeat: -1,
				yoyo: true,
				delay: 1,
			});
		};

		const loadOverlayData = () => {
			queueData.value = StoreProxy.queues.queueList.find(q => q.id === props.id) || null;
			if (queueData.value) {
				data.value = queueData.value.overlayParams;
				displayMode.value = data.value.displayMode === 'alternating' ? 'queue' : data.value.displayMode;
				updateDisplayedItems();
			}
		};

		const onQueueEvent = async (e: TwitchatEvent): Promise<void> => {
			if (e.type !== TwitchatEventType.QUEUE_STATE_CHANGE) return;
			if (e.data.queueId !== props.id) return;

			loadOverlayData();
			startScrollAnimation();
		};

		onMounted(() => {
			loadOverlayData();
			TwitchatEvent.addEventListener(TwitchatEventType.QUEUE_STATE_CHANGE, onQueueEvent);

			if (data.value?.displayMode === 'alternating') {
				alternateInterval.value = window.setInterval(toggleAlternate, 10000); // Switch every 10 seconds
			}

			// Start scroll animation after a short delay to ensure content is rendered
			setTimeout(startScrollAnimation, 500);
		});

		onBeforeUnmount(() => {
			TwitchatEvent.removeEventListener(TwitchatEventType.QUEUE_STATE_CHANGE, onQueueEvent);
			if (alternateInterval.value !== -1) {
				clearInterval(alternateInterval.value);
			}
			if (tween.value) {
				tween.value.kill();
			}
		});

		watch(displayedItems, () => {
			// Restart scroll animation when items change
			startScrollAnimation();
		});

		return {
			containerRef,
			contentRef,
			data,
			displayedItems,
			displayMode,
			containerStyle,
			contentStyle,
			itemStyle,
			getPosition,
		};
	},
});
</script>

<style scoped lang="less">
.overlay-queue {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;

	&.vertical {
		.container {
			width: 100%;
			height: 100%;
			overflow: hidden;

			.content {
				display: flex;
				flex-direction: column;
				gap: 10px;
				padding: 10px;
				width: 100%;
			}
		}
	}

	&.horizontal {
		.container {
			width: 100%;
			height: 100%;
			overflow: hidden;
			display: flex;
			align-items: center;

			.content {
				display: flex;
				flex-direction: row;
				gap: 20px;
				padding: 10px;
				height: auto;
			}
		}
	}

	.queue-item {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(0, 0, 0, 0.5);
		padding: 8px 12px;
		border-radius: 8px;

		.icon {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			overflow: hidden;
			display: flex;
			align-items: center;
			justify-content: center;
			background: #555;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		.user-info {
			flex: 1;

			.user-name {
				font-weight: bold;
			}

			.user-note {
				font-size: 0.8em;
				opacity: 0.8;
				margin-top: 3px;
			}
		}

		.position {
			font-weight: bold;
			font-size: 1.2em;
			padding: 0 10px;
		}
	}
}
</style>
