/* ==========================================================
 * KORRIGIERTER chat-proxy.js Code
 * Modell: openai/gpt-oss-20b
 * Verwendet NATIVE fetch (Node.js 18+), kein node-fetch
 * ==========================================================
 */

// --- Die CORS-Header ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Erlaubt JEDER Domain den Zugriff
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Erlaubt nur POST und OPTIONS
    'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event, context) => {
    
    // --- Schritt 1: CORS Preflight-Anfrage (OPTIONS) abfangen ---
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200, 
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS Preflight OK' })
        };
    }

    // --- Schritt 2: Nur POST-Anfragen zulassen ---
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders, 
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // --- Schritt 3: API-Schlüssel laden ---
    const API_KEY = process.env.TOGETHER_API_KEY;

    if (!API_KEY) {
        console.error('FEHLER: TOGETHER_API_KEY nicht im Netlify Environment gefunden.');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Server-Konfigurationsfehler: API-Schlüssel fehlt.' })
        };
    }

    try {
        // --- Schritt 4: Eingehenden Prompt lesen ---
        const body = JSON.parse(event.body);
        const userPrompt = body.prompt;

        if (!userPrompt) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Kein "prompt" im Body gefunden.' })
            };
        }

        // --- Schritt 5: Together.ai API-Anfrage ---
        const apiUrl = 'https://api.together.xyz/v1/chat/completions';
        
        // KORREKTUR 1: 'messages' muss ein Array von Objekten sein
        const apiRequestBody = {
            model: 'openai/gpt-oss-20b',
            messages: [
                {
                    role: "user",
                    content: userPrompt // Der 'userPrompt' wird hier verwendet
                }
            ],
            temperature: 0.7 
        };

        // --- Schritt 6: Anfrage an Together.ai senden ---
        // Dies verwendet jetzt die NATIVE fetch-Funktion von Node.js 18+
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiRequestBody)
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Together.ai API Fehler:', errorData);
            throw new Error(`Together.ai API Fehler: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        
        // KORREKTUR 2: Die Antwort liegt in 'data.choices[0].message.content'
        const aiReply = data.choices[0].message.content;

        // --- Schritt 7: Erfolgreiche Antwort ---
        return {
            statusCode: 200,
            headers: corsHeaders, 
            body: JSON.stringify({ reply: aiReply })
        };

    } catch (error) {
        console.error('Fehler in der Proxy-Funktion:', error);
        return {
            statusCode: 500,
            headers: corsHeaders, 
            body: JSON.stringify({ error: 'Ein interner Serverfehler ist aufgetreten.' })
        };
    }
};