const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// ENV CONFIG — set in Railway
const TOAST_API_KEY = process.env.TOAST_API_KEY || '';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || '';
const TOAST_API_URL = `https://toast-api.example.com/locations/${TOAST_LOCATION_ID}/orders`; // Replace with real URL when known

app.use(bodyParser.json({ limit: '10mb' }));

// === Helper: Improved Order Parser
function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'ASAP'
    };

    transcript.forEach(turn => {
        const msg = turn.message.toLowerCase();

        if (turn.role === 'user') {
            // Extract name
            if (/my name is/i.test(turn.message)) {
                const match = turn.message.match(/my name is\s+([a-zA-Z\s]+)/i);
                if (match) order.customer_name = match[1].trim();
            }

            // Extract phone
            if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(turn.message)) {
                const match = turn.message.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
                if (match) order.phone = match[1].trim();
            }

            // Extract items — very basic list
            const itemKeywords = [
                'butter chicken', 'chicken biryani', 'shrimp biryani', 'shrimp fry',
                'tandoori chicken', 'half tandoori chicken', 'mango lassi',
                'goat curry', 'chicken tikka', 'paneer tikka', 'chicken vindaloo'
            ];

            itemKeywords.forEach(item => {
                if (msg.includes(item)) {
                    order.items.push({
                        name: item,
                        qty: 1
                    });
                }
            });
        }
    });

    return order.items.length > 0 ? order : null;
}

// POST endpoint for ElevenLabs webhook
app.post('/post-call', async (req, res) => {
    const data = req.body;

    console.log('✅ Webhook received');
    console.log('Call ID:', data?.data?.conversation_id);
    console.log('Transcript Status:', data?.data?.status);
    console.log('Formatted Conversation:\n');

    const transcript = data?.data?.transcript || [];

    if (transcript.length > 0) {
        transcript.forEach(turn => {
            if (turn.role && turn.message) {
                console.log(`${turn.role === 'agent' ? 'Agent' : 'Customer'}: "${turn.message}"`);
            }
        });
    } else {
        console.log('⚠️ No transcript found.');
    }

    if (data?.data?.analysis?.transcript_summary) {
        console.log('\nSummary:');
        console.log(data.data.analysis.transcript_summary);
    }

    // ORDER DETECTION
    const detectedOrder = extractOrderFromTranscript(transcript);

    if (detectedOrder) {
        console.log('\n📦 Detected ORDER — preparing for Toast POS:\n', detectedOrder);

        if (TOAST_API_KEY && TOAST_LOCATION_ID) {
            try {
                const response = await fetch(TOAST_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${TOAST_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order: {
                            customer_name: detectedOrder.customer_name,
                            phone: detectedOrder.phone,
                            items: detectedOrder.items,
                            pickup_time: detectedOrder.pickup_time
                        }
                    })
                });

                const result = await response.json();
                console.log('✅ Toast API Response:', result);
            } catch (err) {
                console.error('❌ Error sending order to Toast:', err.message);
            }
        } else {
            console.log('⚠️ TOAST_API_KEY or TOAST_LOCATION_ID not set — order NOT sent, only logged');
        }
    }

    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
});

