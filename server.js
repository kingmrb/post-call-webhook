const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// ENV variables (now no hard-coded keys)
const TOAST_API_KEY = process.env.TOAST_API_KEY || '';
const TOAST_LOCATION_ID = process.env.TOAST_LOCATION_ID || '';
const TOAST_API_URL = 'https://api.toasttab.com/orders'; // Example endpoint (replace with correct Toast API endpoint)

// Example menu items for improved matching:
const menuItems = [
    'butter chicken', 'mango lassi', 'chicken 65', 'chicken majestic', 'shrimp fry', 'tandoori chicken', 
    'tandoori chicken half', 'chicken dum biryani', 'egg biryani', 'lamb curry', 'goat curry'
];

// Helper: extract order from transcript
function extractOrderFromTranscript(transcript) {
    const order = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [],
        pickup_time: 'N/A'
    };

    // Extract name and phone
    transcript.forEach(turn => {
        if (turn.role === 'user') {
            // Extract name
            const nameMatch = turn.message.match(/my name is\s+([A-Za-z\s]+)/i);
            if (nameMatch) {
                order.customer_name = nameMatch[1].trim();
            }

            // Extract phone
            const phoneMatch = turn.message.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
            if (phoneMatch) {
                order.phone = phoneMatch[1].trim();
            }

            // Extract items
            menuItems.forEach(item => {
                const regex = new RegExp(`(\\d+)\\s*(?:x|order[s]? of|)\\s*${item}`, 'i');
                const match = turn.message.match(regex);
                if (match) {
                    order.items.push({
                        name: item,
                        qty: parseInt(match[1])
                    });
                } else if (turn.message.toLowerCase().includes(item)) {
                    // If no quantity, assume 1
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

// POST endpoint
app.post('/post-call', async (req, res) => {
    const data = req.body;

    console.log('✅ Webhook received');
    console.log('Call ID:', data?.data?.conversation_id);
    console.log('Transcript Status:', data?.data?.status);
    console.log('Formatted Conversation:\n');

    const transcript = data?.data?.transcript || [];

    // Print transcript
    if (transcript.length > 0) {
        transcript.forEach(turn => {
            if (turn.role && turn.message) {
                console.log(`${turn.role === 'agent' ? 'Agent' : 'Customer'}: "${turn.message}"`);
            }
        });
    } else {
        console.log('⚠️ No transcript found.');
    }

    // Print summary
    if (data?.data?.analysis?.transcript_summary) {
        console.log('\nSummary:');
        console.log(data.data.analysis.transcript_summary);
    }

    // Detect order
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
                        location_id: TOAST_LOCATION_ID,
                        order: { ...detectedOrder }
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

