<script lang="ts">
    import { onMount } from "svelte";
    import CardGrid from "$lib/components/CardGrid.svelte";
    import RandomCardDisplay from "$lib/components/RandomCardDisplay.svelte";
    import { getTest, postTest } from "./data.remote";

    import type { Card, CardFace } from "$lib/types/scryfall";

    let card: Card | null = null;
    let loading = false;
    let rating = false; // New state for rating process
    let error = "";
    let localCardCount = 0;
    let cardStats = {
        total: 0,
        interesting: 0,
        not_interesting: 0,
        unrated: 0,
    };
    let viewMode = "random" as
        | "random"
        | "interesting"
        | "not_interesting"
        | "manage";
    let interestingCards: Card[] = [];
    let notInterestingCards: Card[] = [];
    let loadingGrid = false;
    let databaseInitialized = false;
    let initializing = false;

    // Card preloading system
    let cardQueue: Card[] = [];
    let preloading = false;
    const QUEUE_TARGET_SIZE = 8; // Keep 8 cards preloaded
    const QUEUE_REFILL_THRESHOLD = 3; // Refill when queue drops to 3 cards

    // Admin/sync functionality
    let syncing = false;
    let syncResult = "";
    let syncError = "";
    let syncProgress = { processed: 0, total: 0, currentCard: "" };
    let showUpdateSection = false;

    // Import/export functionality
    let importing = false;
    let exporting = false;
    let importResult = "";
    let exportResult = "";
    let importError = "";
    let exportError = "";

    // Clear functionality
    let clearingDatabase = false;
    let clearingProgress = false;
    let clearResult = "";
    let clearError = "";

    async function initializeDatabase() {
        initializing = true;
        error = "";

        try {
            const response = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "init" }),
            });

            const data = await response.json();

            if (data.success) {
                databaseInitialized = true;
                await checkLocalDatabase();
            } else {
                error = data.message;
            }
        } catch (err) {
            error = "Failed to initialize database. Please try again.";
            console.error("Database initialization error:", err);
        } finally {
            initializing = false;
        }
    }

    async function checkLocalDatabase() {
        try {
            const response = await fetch("/api/cards");
            const data = await response.json();

            if (data.success) {
                localCardCount = data.count;
                cardStats = data.stats || {
                    total: 0,
                    interesting: 0,
                    not_interesting: 0,
                    unrated: 0,
                };

                // Initialize card queue if we have cards and no current card
                if (localCardCount > 0 && !card && cardQueue.length === 0) {
                    await initializeCardQueue();
                }
            } else {
                localCardCount = 0;
                cardStats = {
                    total: 0,
                    interesting: 0,
                    not_interesting: 0,
                    unrated: 0,
                };
            }
        } catch (err) {
            console.error("Error checking database:", err);
            localCardCount = 0;
            cardStats = {
                total: 0,
                interesting: 0,
                not_interesting: 0,
                unrated: 0,
            };
        }
    }

    async function fetchRandomCard() {
        if (cardQueue.length > 0) {
            // Use preloaded card from queue
            card = cardQueue.shift() || null;
            error = "";

            // Refill queue if it's getting low
            if (cardQueue.length <= QUEUE_REFILL_THRESHOLD) {
                refillCardQueue();
            }
            return;
        }

        // Fallback to direct fetch if queue is empty
        loading = true;
        error = "";

        try {
            // For random mode, fetch unrated cards
            const response = await fetch(`/api/cards/random?rating=unrated`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message);
            }

            card = data.card;
        } catch (err) {
            if (
                err instanceof Error &&
                err.message.includes("No commander cards found")
            ) {
                error =
                    "No commander cards found in database. Please update the database first.";
            } else {
                error = "Failed to fetch card. Please try again.";
            }
            console.error("Error fetching card:", err);
        } finally {
            loading = false;
        }
    }

    async function preloadCard(): Promise<Card | null> {
        try {
            // Always preload unrated cards for the random mode
            const response = await fetch(`/api/cards/random?rating=unrated`);
            const data = await response.json();

            if (data.success) {
                return data.card;
            } else {
                console.warn("Failed to preload card:", data.message);
                return null;
            }
        } catch (err) {
            console.error("Error preloading card:", err);
            return null;
        }
    }

    async function refillCardQueue() {
        if (preloading) return; // Prevent multiple simultaneous refills

        preloading = true;
        try {
            const cardsToLoad = QUEUE_TARGET_SIZE - cardQueue.length;
            if (cardsToLoad <= 0) return;

            // Load cards in parallel for faster preloading
            const preloadPromises = Array(cardsToLoad)
                .fill(null)
                .map(() => preloadCard());
            const preloadedCards = await Promise.all(preloadPromises);

            // Add successfully loaded cards to queue, filter out nulls
            const validCards = preloadedCards.filter(
                (card): card is Card => card !== null,
            );
            cardQueue.push(...validCards);

            console.log(
                `Preloaded ${validCards.length} cards. Queue size: ${cardQueue.length}`,
            );
        } finally {
            preloading = false;
        }
    }

    function clearCardQueue() {
        cardQueue = [];
        console.log("Card queue cleared");
    }

    async function fetchCardsByRating(
        rating: "interesting" | "not_interesting",
    ): Promise<Card[]> {
        try {
            const response = await fetch(
                `/api/cards/by-rating?rating=${rating}`,
            );
            const data = await response.json();

            if (data.success) {
                return data.cards || [];
            } else {
                console.error("Failed to fetch cards by rating:", data.message);
                return [];
            }
        } catch (err) {
            console.error("Error fetching cards by rating:", err);
            return [];
        }
    }

    async function switchViewMode(
        newMode: "random" | "interesting" | "not_interesting" | "manage",
    ) {
        viewMode = newMode;

        if (newMode === "interesting" || newMode === "not_interesting") {
            loadingGrid = true;
            try {
                const cards = await fetchCardsByRating(newMode);
                if (newMode === "interesting") {
                    interestingCards = cards;
                } else {
                    notInterestingCards = cards;
                }
            } finally {
                loadingGrid = false;
            }
        }
    }

    async function initializeCardQueue() {
        // Initial queue fill
        await refillCardQueue();
        // Load the first card
        if (cardQueue.length > 0) {
            await fetchRandomCard();
        }
    }

    async function rateCard(
        targetRating: "interesting" | "not_interesting" | null,
    ) {
        if (!card?.id) {
            error = "No card to rate";
            return;
        }

        rating = true;
        error = "";

        try {
            const response = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "rate",
                    cardId: card.id,
                    rating: targetRating,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update the card's rating in the UI
                if (card) {
                    card.interestRating = targetRating;
                }
                // Refresh stats
                await checkLocalDatabase();

                // Auto-load next card for interesting/not_interesting ratings
                if (
                    targetRating === "interesting" ||
                    targetRating === "not_interesting"
                ) {
                    // Small delay to show the rating was applied
                    setTimeout(() => {
                        fetchRandomCard();
                    }, 500);
                }
            } else {
                error = data.message;
            }
        } catch (err) {
            error = "Failed to rate card. Please try again.";
            console.error("Error rating card:", err);
        } finally {
            rating = false;
        }
    }

    async function startSync() {
        if (syncing) return;

        syncing = true;
        syncResult = "";
        syncError = "";

        try {
            const response = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "sync" }),
            });

            const data = await response.json();

            if (data.success) {
                syncResult = data.message;
                // Clear the card queue to force reload with correct format
                cardQueue = [];
                await checkLocalDatabase(); // Refresh count
                // Try to fetch a card after successful sync
                if (localCardCount === 0) {
                    setTimeout(fetchRandomCard, 1000);
                }
            } else {
                syncError = data.message;
            }
        } catch (err) {
            syncError = "Failed to sync cards. Please try again.";
            console.error("Sync error:", err);
        } finally {
            syncing = false;
        }
    }

    async function exportRatings() {
        exporting = true;
        exportError = "";
        exportResult = "";

        try {
            const response = await fetch("/api/export-ratings");
            const data = await response.json();

            if (data.success) {
                // Create and download the file
                const blob = new Blob([JSON.stringify(data.ratings, null, 2)], {
                    type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mtgc-ratings-${new Date().toISOString().split("T")[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                exportResult = `Exported ${data.count} rated cards`;
            } else {
                exportError = data.message;
            }
        } catch (err) {
            exportError = "Failed to export ratings. Please try again.";
            console.error("Export error:", err);
        } finally {
            exporting = false;
        }
    }

    async function importRatings() {
        importing = true;
        importError = "";
        importResult = "";

        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) {
                    importing = false;
                    return;
                }

                try {
                    const text = await file.text();
                    const ratings = JSON.parse(text);

                    const response = await fetch("/api/import-ratings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ratings }),
                    });

                    const data = await response.json();

                    if (data.success) {
                        importResult = data.message;
                        await checkLocalDatabase(); // Refresh stats
                    } else {
                        importError = data.message;
                    }
                } catch (err) {
                    importError =
                        "Failed to parse or import file. Please check the file format.";
                    console.error("Import error:", err);
                } finally {
                    importing = false;
                }
            };
            input.click();
        } catch (err) {
            importError = "Failed to open file dialog.";
            console.error("Import dialog error:", err);
            importing = false;
        }
    }

    async function clearDatabase() {
        if (
            !confirm(
                "⚠️ This will permanently delete ALL cards from the database. Are you sure?",
            )
        ) {
            return;
        }

        clearingDatabase = true;
        clearError = "";
        clearResult = "";

        try {
            const response = await fetch("/api/clear-database", {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                clearResult = data.message;
                // Reset all state
                localCardCount = 0;
                cardStats = {
                    total: 0,
                    interesting: 0,
                    not_interesting: 0,
                    unrated: 0,
                };
                card = null;
                cardQueue = [];
                interestingCards = [];
                notInterestingCards = [];
            } else {
                clearError = data.message;
            }
        } catch (err) {
            clearError = "Failed to clear database. Please try again.";
            console.error("Clear database error:", err);
        } finally {
            clearingDatabase = false;
        }
    }

    async function clearProgress() {
        if (
            !confirm(
                "⚠️ This will remove all your card ratings but keep the cards. Are you sure?",
            )
        ) {
            return;
        }

        clearingProgress = true;
        clearError = "";
        clearResult = "";

        try {
            const response = await fetch("/api/clear-progress", {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                clearResult = data.message;
                // Reset rating-related state
                cardStats = {
                    total: cardStats.total,
                    interesting: 0,
                    not_interesting: 0,
                    unrated: cardStats.total,
                };
                interestingCards = [];
                notInterestingCards = [];
                // Clear current card rating if it exists
                if (card) {
                    card.interestRating = null;
                }
            } else {
                clearError = data.message;
            }
        } catch (err) {
            clearError = "Failed to clear progress. Please try again.";
            console.error("Clear progress error:", err);
        } finally {
            clearingProgress = false;
        }
    }

    // Helper functions for double-faced cards
    function isDoubleFaced(card: Card): boolean {
        return !!(card.cardFaces && card.cardFaces.length >= 2);
    }

    function getCardName(card: Card): string {
        if (isDoubleFaced(card) && card.cardFaces) {
            return `${card.cardFaces[0].name} // ${card.cardFaces[1].name}`;
        }
        return card.name;
    }

    onMount(async () => {
        // Automatically initialize database on app load
        await initializeDatabase();
        await checkLocalDatabase();
        fetchRandomCard();
    });

    function formatColors(colors: string[] | undefined): string {
        if (!colors || colors.length === 0) return "Colorless";
        return colors.join(", ");
    }

    const query = getTest();

    const post = postTest("Hello from SvelteKit!");
</script>

<div
    class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8"
>
    {#if query.error}
        <p>oops!</p>
    {:else if query.loading}
        <p>loading...</p>
    {:else}
        <p>{query.current}</p>
    {/if}

    {#if post.error}
        <p>oops!</p>
    {:else if post.loading}
        <p>loading...</p>
    {:else}
        <p>{post.current}</p>
    {/if}

    <div class="container mx-auto px-4">
        <!-- Main Content - Only show when database is initialized -->
        <div class="max-w-7xl mx-auto flex gap-6">
            <!-- Sidebar with Stats and Controls -->
            <div>
                <div
                    class="bg-white/10 backdrop-blur-sm rounded-lg p-6 shadow-lg sticky top-4"
                >
                    <h3 class="font-semibold text-white mb-4 text-center">
                        Database Stats
                    </h3>
                    <div class="space-y-3 mb-4">
                        <div class="bg-blue-500/20 rounded-lg p-2 text-center">
                            <p class="text-xl font-bold text-blue-300">
                                {cardStats.total.toLocaleString()}
                            </p>
                            <p class="text-xs text-gray-300">Total</p>
                        </div>
                        <div class="bg-green-500/20 rounded-lg p-2 text-center">
                            <p class="text-xl font-bold text-green-300">
                                {cardStats.interesting.toLocaleString()}
                            </p>
                            <p class="text-xs text-gray-300">Interesting</p>
                        </div>
                        <div class="bg-red-500/20 rounded-lg p-2 text-center">
                            <p class="text-xl font-bold text-red-300">
                                {cardStats.not_interesting.toLocaleString()}
                            </p>
                            <p class="text-xs text-gray-300">Not Interesting</p>
                        </div>
                        <div class="bg-gray-500/20 rounded-lg p-2 text-center">
                            <p class="text-xl font-bold text-gray-300">
                                {cardStats.unrated.toLocaleString()}
                            </p>
                            <p class="text-xs text-gray-300">Unrated</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 min-w-0">
                <div class="max-w-4xl mx-auto mb-8">
                    <div class="border-b border-white/20">
                        <nav class="flex space-x-8" aria-label="Tabs">
                            <button
                                onclick={() => switchViewMode("random")}
                                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {viewMode ==
                                'random'
                                    ? 'border-blue-400 text-blue-300'
                                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'}"
                            >
                                🎲 Random Card Categorizer
                            </button>
                            <button
                                onclick={() => switchViewMode("interesting")}
                                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {viewMode ==
                                'interesting'
                                    ? 'border-green-400 text-green-300'
                                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'}"
                            >
                                👍 Interesting Cards ({cardStats.interesting})
                            </button>
                            <button
                                onclick={() =>
                                    switchViewMode("not_interesting")}
                                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {viewMode ==
                                'not_interesting'
                                    ? 'border-red-400 text-red-300'
                                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'}"
                            >
                                👎 Not Interesting Cards ({cardStats.not_interesting})
                            </button>
                            <button
                                onclick={() => switchViewMode("manage")}
                                class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {viewMode ==
                                'manage'
                                    ? 'border-yellow-400 text-yellow-300'
                                    : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'}"
                            >
                                ⚙️ Manage Database
                            </button>
                        </nav>
                    </div>
                </div>

                <!-- Tab Content Areas -->
                <div class="max-w-6xl mx-auto">
                    <!-- Random Card Categorizer Tab -->
                    {#if viewMode == "random"}
                        <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                            <RandomCardDisplay
                                {card}
                                {loading}
                                {rating}
                                {error}
                                on:randomCard={fetchRandomCard}
                                on:rateCard={(
                                    e: CustomEvent<{ rating: string }>,
                                ) =>
                                    rateCard(
                                        e.detail.rating as
                                            | "interesting"
                                            | "not_interesting",
                                    )}
                                on:showUpdate={() => (showUpdateSection = true)}
                            />
                        </div>

                        <!-- Interesting Cards Tab -->
                    {:else if viewMode == "interesting"}
                        <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                            <CardGrid
                                cards={interestingCards}
                                loading={loadingGrid}
                                interest="interesting"
                            />
                        </div>

                        <!-- Not Interesting Cards Tab -->
                    {:else if viewMode == "not_interesting"}
                        <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                            <CardGrid
                                cards={notInterestingCards}
                                loading={loadingGrid}
                                interest="not interesting"
                            />
                        </div>

                        <!-- Manage Database Tab -->
                    {:else if viewMode == "manage"}
                        <div class="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                            <div class="max-w-2xl mx-auto space-y-6">
                                <h2
                                    class="text-2xl font-bold text-white text-center mb-6"
                                >
                                    Database Management
                                </h2>

                                <!-- Sync Database Section -->
                                <div class="bg-white/10 rounded-lg p-4">
                                    <h3
                                        class="text-lg font-semibold text-white mb-3"
                                    >
                                        🔄 Sync Database
                                    </h3>
                                    <p class="text-gray-300 text-sm mb-4">
                                        Update your database with the latest
                                        cards from Scryfall
                                    </p>

                                    <button
                                        onclick={startSync}
                                        disabled={syncing}
                                        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                    >
                                        {syncing
                                            ? "🔄 Syncing..."
                                            : "🔄 Sync Cards"}
                                    </button>

                                    <!-- Sync Results -->
                                    {#if syncResult}
                                        <div
                                            class="bg-green-500/20 border border-green-400 text-green-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ✅ Sync Success
                                            </p>
                                            <p>{syncResult}</p>
                                        </div>
                                    {/if}

                                    {#if syncError}
                                        <div
                                            class="bg-red-500/20 border border-red-400 text-red-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ❌ Sync Error
                                            </p>
                                            <p>{syncError}</p>
                                        </div>
                                    {/if}

                                    {#if syncing}
                                        <div
                                            class="bg-blue-500/20 border border-blue-400 text-blue-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                🔄 Syncing in Progress
                                            </p>
                                            <p>
                                                Processed: {syncProgress.processed.toLocaleString()}
                                                / {syncProgress.total.toLocaleString()}
                                            </p>
                                            {#if syncProgress.currentCard}
                                                <p class="text-xs opacity-75">
                                                    Current: {syncProgress.currentCard}
                                                </p>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>

                                <!-- Import/Export Section -->
                                <div class="bg-white/10 rounded-lg p-4">
                                    <h3
                                        class="text-lg font-semibold text-white mb-3"
                                    >
                                        📂 Import/Export Ratings
                                    </h3>
                                    <p class="text-gray-300 text-sm mb-4">
                                        Backup your ratings or import from
                                        another database
                                    </p>

                                    <div class="grid grid-cols-2 gap-3">
                                        <button
                                            onclick={exportRatings}
                                            disabled={exporting}
                                            class="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                        >
                                            {exporting
                                                ? "📤 Exporting..."
                                                : "📤 Export Ratings"}
                                        </button>
                                        <button
                                            onclick={importRatings}
                                            disabled={importing}
                                            class="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                        >
                                            {importing
                                                ? "📥 Importing..."
                                                : "📥 Import Ratings"}
                                        </button>
                                    </div>

                                    <!-- Import/Export Results -->
                                    {#if exportResult}
                                        <div
                                            class="bg-green-500/20 border border-green-400 text-green-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ✅ Export Success
                                            </p>
                                            <p>{exportResult}</p>
                                        </div>
                                    {/if}

                                    {#if importResult}
                                        <div
                                            class="bg-green-500/20 border border-green-400 text-green-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ✅ Import Success
                                            </p>
                                            <p>{importResult}</p>
                                        </div>
                                    {/if}

                                    {#if exportError}
                                        <div
                                            class="bg-red-500/20 border border-red-400 text-red-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ❌ Export Error
                                            </p>
                                            <p>{exportError}</p>
                                        </div>
                                    {/if}

                                    {#if importError}
                                        <div
                                            class="bg-red-500/20 border border-red-400 text-red-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ❌ Import Error
                                            </p>
                                            <p>{importError}</p>
                                        </div>
                                    {/if}
                                </div>

                                <!-- Clear Operations Section -->
                                <div
                                    class="bg-red-500/10 border border-red-400/30 rounded-lg p-4"
                                >
                                    <h3
                                        class="text-lg font-semibold text-red-300 mb-3"
                                    >
                                        ⚠️ Danger Zone
                                    </h3>
                                    <p class="text-gray-300 text-sm mb-4">
                                        These actions cannot be undone
                                    </p>

                                    <div class="grid grid-cols-2 gap-3">
                                        <button
                                            onclick={clearProgress}
                                            disabled={clearingProgress}
                                            class="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                        >
                                            {clearingProgress
                                                ? "🗑️ Clearing..."
                                                : "🗑️ Clear Progress"}
                                        </button>
                                        <button
                                            onclick={clearDatabase}
                                            disabled={clearingDatabase}
                                            class="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                        >
                                            {clearingDatabase
                                                ? "💥 Clearing..."
                                                : "💥 Clear Database"}
                                        </button>
                                    </div>

                                    <div
                                        class="grid grid-cols-2 gap-3 mt-2 text-xs text-gray-400"
                                    >
                                        <p>Removes ratings, keeps cards</p>
                                        <p>Removes all cards</p>
                                    </div>

                                    <!-- Clear Results -->
                                    {#if clearResult}
                                        <div
                                            class="bg-green-500/20 border border-green-400 text-green-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ✅ Success
                                            </p>
                                            <p>{clearResult}</p>
                                        </div>
                                    {/if}

                                    {#if clearError}
                                        <div
                                            class="bg-red-500/20 border border-red-400 text-red-100 px-3 py-2 rounded text-sm mt-3"
                                        >
                                            <p class="font-semibold">
                                                ❌ Error
                                            </p>
                                            <p>{clearError}</p>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
            <!-- End of Main Content Area -->
        </div>
        <!-- End of flex container -->
    </div>
    <!-- End of container -->
</div>
<!-- End of main bg div -->
