const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Toast needs fetch

const app = express();
const port = process.env.PORT || 3000;

// === Hardcoded Toast test config ===
const TOAST_API_KEY = 'your-test-toast-api-key';
const TOAST_LOCATION_ID = 'test-location-id';
const TOAST_API_URL = `https://toast-api.example.com/locations/${TOAST_LOCATION_ID}/orders`; // Example

app.use(bodyParser.json({ limit: '10mb' }));

function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'N/A'
    };

    // Example items
    const itemKeywords = [
        'butter chicken',
        'chicken biryani',
        'shrimp fry',
        'shrimp biryani',
        'tandoori chicken',
        'mango lassi'
    ];

    transcript.forEach(turn => {
        const msg = turn.message ? turn.message.toLowerCase() : '';

        if (turn.role === 'user') {
            // Name
            if (/my name is/i.test(msg)) {
                const match = msg.match(/my name is\s+([a-zA-Z\s]+)/i);
                if (match) order.customer_name = match[1].trim();
            }

            // Phone
            if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(msg)) {
                const match = msg.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
                if (match) order.phone = match[1].trim();
            }

            // Items
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

    if (order.items.length > 0) {
        return order;
    } else {
        return null;
    }
}

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

        try {
            const response = await fetch(TOAST_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOAST_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    order: { ...detectedOrder }
                })
            });

            const result = await response.json();
            console.log('✅ Toast API Response:', result);
        } catch (err) {
            console.error('❌ Error sending order to Toast:', err.message);
        }
    }

    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
});

