const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Add this package for Square API

const app = express();
const port = process.env.PORT || 3000;

// === Config — put your Square token here later ===
const SQUARE_API_TOKEN = process.env.SQUARE_API_TOKEN || ''; // You can set in Railway ENV later
const SQUARE_API_URL = 'https://connect.squareup.com/v2/orders'; // Example URL

app.use(bodyParser.json({ limit: '10mb' }));

// === Helper: Detect if transcript contains order (very simple example) ===
function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'N/A'
    };

    // Example: Look for "I'd like to order", "Can I get"
    transcript.forEach(turn => {
        if (turn.role === 'user' && /order|can I get|I'd like/.test(turn.message.toLowerCase())) {
            order.items.push({
                name: 'Sample Item',
                qty: 1
            });
        }
    });

    // Simple logic: If items found, assume it's an order
    if (order.items.length > 0) {
        return order;
    } else {
        return null;
    }
}

// POST endpoint for ElevenLabs Post-Call webhook
app.post('/post-call', async (req, res) => {
    const data = req.body;

    console.log('✅ Webhook received');
    console.log('Call ID:', data?.data?.conversation_id);
    console.log('Transcript Status:', data?.data?.status);
    console.log('Formatted Conversation:\n');

    const transcript = data?.data?.transcript || [];

    // Print the conversation transcript
    if (transcript.length > 0) {
        transcript.forEach(turn => {
            if (turn.role && turn.message) {
                console.log(`${turn.role === 'agent' ? 'Agent' : 'Customer'}: "${turn.message}"`);
            }
        });
    } else {
        console.log('⚠️ No transcript found.');
    }

    // If ElevenLabs included analysis summary
    if (data?.data?.analysis?.transcript_summary) {
        console.log('\nSummary:');
        console.log(data.data.analysis.transcript_summary);
    }

    // === ORDER DETECTION ===
    const detectedOrder = extractOrderFromTranscript(transcript);

    if (detectedOrder) {
        console.log('\n📦 Detected ORDER — preparing for Square:\n', detectedOrder);

        if (SQUARE_API_TOKEN) {
            try {
                const response = await fetch(SQUARE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SQUARE_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order: {
                            ...detectedOrder
                        }
                    })
                });

                const result = await response.json();
                console.log('✅ Square API Response:', result);
            } catch (err) {
                console.error('❌ Error sending order to Square:', err.message);
            }
        } else {
            console.log('⚠️ SQUARE_API_TOKEN not set — order NOT sent, only logged');
        }
    }

    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
});

