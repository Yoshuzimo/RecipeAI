
'use server';

import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { initFirebaseAdmin } from './firebase-admin';

initFirebaseAdmin();

export async function getCurrentUserId(): Promise<string> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        throw new Error("Authentication required. Please log in.");
    }
    try {
        const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        throw new Error("Your session has expired. Please log in again.");
    }
}

    