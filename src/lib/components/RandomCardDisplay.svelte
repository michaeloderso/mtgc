<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface CardFace {
		name: string;
		mana_cost?: string;
		type_line?: string;
		oracle_text?: string;
		colors?: string[];
		power?: string;
		toughness?: string;
		image_uri_png?: string;
	}

	interface Card {
		id: string;
		name: string;
		oracle_text?: string;
		mana_cost?: string;
		type_line?: string;
		colors?: string[];
		color_identity?: string[];
		power?: string;
		toughness?: string;
		image_uri_png?: string;
		card_faces?: CardFace[];
		prices?: {
			usd?: string;
		};
		interest_rating?: 'interesting' | 'not_interesting' | null;
	}

	export let card: Card | null = null;
	export let loading = false;
	export let rating = false;
	export let error = '';

	const dispatch = createEventDispatcher();

	function isDoubleFaced(card: Card): boolean {
		return Boolean(card.card_faces && card.card_faces.length >= 2);
	}

	function getCardName(card: Card): string {
		if (isDoubleFaced(card) && card.card_faces) {
			return card.card_faces.map(face => face.name).join(' // ');
		}
		return card.name;
	}

	function getCardImage(card: Card): string | undefined {
		if (isDoubleFaced(card) && card.card_faces && card.card_faces[0]) {
			return card.card_faces[0].image_uri_png;
		}
		return card.image_uri_png;
	}

	function handleRandomCard() {
		dispatch('randomCard');
	}

	function handleRateCard(rating: string) {
		dispatch('rateCard', { rating });
	}
</script>

<div class="space-y-8">
	<!-- Card Rating and Control Buttons -->
	<div class="max-w-md mx-auto">
		<div class="bg-white/10 backdrop-blur-sm rounded-lg p-4 shadow-lg">
			<div class="flex justify-center gap-3">
				<button
					on:click={handleRandomCard}
					disabled={loading}
					class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
				>
					{loading ? 'Loading...' : '🎲 Random'}
				</button>
				{#if card}
					<button
						on:click={() => handleRateCard('interesting')}
						disabled={rating}
						class="px-6 py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {card.interest_rating === 'interesting' ? 'bg-green-600 text-white' : 'bg-green-600/30 text-green-200 hover:bg-green-600/50'}"
					>
						{rating ? '⏳' : '👍'} Interesting
					</button>
					<button
						on:click={() => handleRateCard('not_interesting')}
						disabled={rating}
						class="px-6 py-3 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed {card.interest_rating === 'not_interesting' ? 'bg-red-600 text-white' : 'bg-red-600/30 text-red-200 hover:bg-red-600/50'}"
					>
						{rating ? '⏳' : '👎'} Not Interesting
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Card Display -->
	{#if loading}
		<div class="flex justify-center">
			<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
		</div>
	{:else if card}
		<div class="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
			<div class="p-6 text-center">
				<!-- Card Name -->
				<h2 class="text-2xl font-bold text-gray-900 mb-4">{getCardName(card)}</h2>
				
				<!-- Card Images -->
				{#if isDoubleFaced(card)}
					<!-- Double-faced card: show both images side by side -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{#each [0, 1] as faceIndex}
							{#if card.card_faces && card.card_faces[faceIndex]?.image_uri_png}
								<div class="flex flex-col items-center">
									<img
										src={card.card_faces[faceIndex].image_uri_png}
										alt={card.card_faces[faceIndex].name}
										class="w-full max-w-xs h-auto object-cover rounded-lg shadow-lg"
									/>
									<p class="text-sm text-gray-600 mt-2 font-medium">
										{faceIndex === 0 ? 'Front' : 'Back'}
									</p>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<!-- Single-faced card: show one image -->
					{#if getCardImage(card)}
						<div class="mb-4">
							<img
								src={getCardImage(card)}
								alt={getCardName(card)}
								class="w-full max-w-xs mx-auto h-auto object-cover rounded-lg shadow-lg"
							/>
						</div>
					{/if}
				{/if}
				
				<!-- Card Price -->
				{#if card.prices?.usd}
					<p class="text-lg text-green-600 font-semibold">
						${card.prices.usd} USD
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="bg-red-500 text-white p-4 rounded-lg max-w-md mx-auto">
			{error}
			{#if error.includes('No commander cards found')}
				<div class="mt-2">
					<button 
						on:click={() => dispatch('showUpdate')}
						class="underline hover:text-red-200"
					>
						Update database now
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>