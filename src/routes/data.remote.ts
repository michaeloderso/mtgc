import { query, form } from '$app/server';
import { db } from "$lib/server/db";
import { eq } from 'drizzle-orm';

import * as z from "zod";


export const getTest = query(async () => {
    const test = "This is a test from data.remote.ts";
    return test;
});


export const postTest = query(z.string(), async (msg) => {
    console.log(msg)
    return `You sent: ${msg}`;
});