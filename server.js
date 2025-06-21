const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Toast API prep

const app = express();
const port = process.env.PORT || 3000;

// === Config (put your Toast token + location later)
const TOAST_API_KEY = process.env.TOAST_API_KEY || '';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || '';
const TOAST_API_URL = `https://toast-api.example.com/locations/${TOAST_LOCATION_ID}/orders`; // Example URL placeholder

app.use(bodyParser.json({ limit: '10mb' }));

// === Simple order parser
function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'N/A'
    };

    transcript.forEach(turn => {
        if (turn.role === 'user' && /order|pickup|can I get|I'd like/.test(turn.message.toLowerCase())) {
            order.items.push({
                name: 'Sample Item',
                qty: 1
            });
        }
    });

    if (order.items.length > 0) {
        return order;
    } else {
        return null;
    }
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
                            ...detectedOrder
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

