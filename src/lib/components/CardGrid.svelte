<script lang="ts">
	import type { Card } from '$lib/types/scryfall';

	let { cards, loading, interest } = $props();




</script>

{#if loading}
	<div class="flex justify-center">
		<div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
	</div>
{:else if cards.length > 0}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
		{#each cards as card}
			<div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
				{#if card.imageUris?.png}
					<img
						src={card.imageUris?.png}
						alt={card.name}
						class="w-full h-64 object-cover"
					/>
				{:else}
					<div class="w-full h-64 bg-gray-200 flex items-center justify-center">
						<span class="text-gray-500">No Image Available</span>
					</div>
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
		<p class="text-xl mb-4">No cards yet!</p>
		<p class="text-gray-300">"Rate some cards as {interest} to see them here."</p>
	</div>
{/if}