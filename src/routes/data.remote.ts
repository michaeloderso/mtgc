import { query, form } from '$app/server';
import { db } from "$lib/server/db";
import { cards } from "$lib/server/db/schema";

import { eq, ne } from 'drizzle-orm';

import * as z from "zod";
import { cardFaceSchema, cardSchema } from '$lib/types/scryfall';


export const getTest = query(async () => {
    const test = "This is a test from data.remote.ts";
    return test;
});



export const postTest = query(z.string(), async (msg) => {
    console.log(msg)
    return `You sent: ${msg}`;
});


export const clearDatabase = query(async () => {
    try {
        await db.delete(cards);
        return { success: true, message: "Database cleared successfully. All cards have been removed." };
    } catch (error) {
        console.error('Clear database error:', error);
        return { success: false, message: 'Failed to clear database' };
    }
});

export const clearProgress = query(async () => {
    try {
        await db.update(cards).set({ interestRating: null });
        return { success: true, message: "Progress cleared successfully. All card ratings have been removed." };
    } catch (error) {
        console.error('Clear progress error:', error);
        return { success: false, message: 'Failed to clear progress' };
    }
});

export const getStats = query(async () => {
    const totalCards = await db.select().from(cards);
        const interestingCards = await db.select().from(cards).where(eq(cards.interestRating, "interesting"));
        const notInterestingCards = await db.select().from(cards).where(eq(cards.interestRating, "not_interesting"));
        const unratedCards = totalCards.length - (interestingCards.length + notInterestingCards.length);

        return { 
            total: totalCards.length,
            interesting: interestingCards.length,
            notInteresting: notInterestingCards.length,
            unrated: unratedCards
        };
});