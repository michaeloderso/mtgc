<script lang="ts">

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
		cmc?: number;
		type_line?: string;
		set_name?: string;
		rarity?: string;
		image_uri_png?: string;
		prices?: {
			usd?: string;
		};
		colors?: string[];
		color_identity?: string[];
		power?: string;
		toughness?: string;
		card_faces?: CardFace[];
		interest_rating?: 'interesting' | 'not_interesting' | null;
	}

	export let cards: Card[] = [];
	export let loading = false;
	export let emptyMessage = 'No cards found';
	export let emptySubMessage = '';


</script>

{#if loading}
	<div class="flex justify-center">
		<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
	</div>
{:else if cards.length > 0}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
		{#each cards as card}
			<div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
				{#if card.image_uri_png}
					<img
						src={card.image_uri_png}
						alt={card.name}
						class="w-full h-64 object-cover"
					/>
				{/if}
				<div class="p-4">
					<h3 class="font-bold text-gray-900 text-sm mb-2 line-clamp-2">{card.name}</h3>
					{#if card.prices?.usd}
						<p class="text-sm text-green-600 font-semibold">${card.prices.usd}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center text-white">
		<p class="text-xl mb-4">{emptyMessage}</p>
		<p class="text-gray-300">{emptySubMessage}</p>
	</div>
{/if}