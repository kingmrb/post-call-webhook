const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

const TOAST_API_KEY = process.env.TOAST_API_KEY || '';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || '';

app.use(bodyParser.json({ limit: '10mb' }));

// === Helper — simple regex-based order extractor ===
function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'N/A'
    };

    const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/;
    const quantityWords = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };

    transcript.forEach(turn => {
        const msg = turn.message.toLowerCase();

        // Extract phone
        if (order.phone === 'N/A') {
            const phoneMatch = turn.message.match(phoneRegex);
            if (phoneMatch) {
                order.phone = phoneMatch[1];
            }
        }

        // Extract name (very simple)
        if (order.customer_name === 'N/A' && msg.includes('my name is')) {
            const parts = turn.message.split('my name is');
            if (parts[1]) {
                order.customer_name = parts[1].split('.')[0].trim();
            }
        }

        // Extract items
        if (turn.role === 'user' && /order|can i get|i want|i'd like|pickup/.test(msg)) {
            const itemMatches = turn.message.match(/\b(\w+)\s+(butter chicken|chicken dum biryani|egg biryani|chicken majestic|chicken 65|chicken vindaloo|mango lassi|naan|paneer tikka masala)\b/gi);
            
            if (itemMatches) {
                itemMatches.forEach(match => {
                    const parts = match.trim().split(' ');
                    let qty = 1;
                    let itemName = parts.slice(1).join(' ');

                    if (quantityWords[parts[0]]) {
                        qty = quantityWords[parts[0]];
                    } else if (!isNaN(parseInt(parts[0]))) {
                        qty = parseInt(parts[0]);
                    }

                    order.items.push({
                        name: itemName,
                        qty
                    });
                });
            }
        }

        // (Optional) pickup time — future improvement
    });

    return order.items.length > 0 ? order : null;
}

// POST endpoint for ElevenLabs Post-Call webhook
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
                const response = await fetch(`https://api.toasttab.com/v1/locations/${TOAST_LOCATION_ID}/orders`, {
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

