const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // required for Toast API

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));

// POST endpoint for ElevenLabs Post-Call webhook
app.post('/post-call', async (req, res) => {
    const data = req.body;

    console.log('✅ Webhook received');
    console.log('Call ID:', data?.data?.conversation_id);
    console.log('Transcript Status:', data?.data?.status);
    console.log('Formatted Conversation:\n');

    // Print the conversation transcript
    if (data?.data?.transcript?.length > 0) {
        data.data.transcript.forEach(turn => {
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

    // Detect AI-generated order from summary — placeholder logic
    const detectedOrder = {
        customer_name: 'N/A',
        phone: 'N/A',
        items: [ { name: 'Sample Item', qty: 1 } ],
        pickup_time: 'N/A'
    };

    console.log('\n📦 Detected ORDER — preparing for Toast POS:');
    console.log(detectedOrder);

    if (process.env.TOAST_API_KEY && process.env.TOAST_LOCATION_ID) {
        try {
            const response = await fetch(`https://api.toasttab.com/v3/locations/${process.env.TOAST_LOCATION_ID}/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.TOAST_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // You need to map the detectedOrder format to Toast Order schema here:
                    // https://developer.toasttab.com
                    "orderType": "TAKEOUT",
                    "items": detectedOrder.items.map(item => ({
                        name: item.name,
                        quantity: item.qty
                    })),
                    "customer": {
                        name: detectedOrder.customer_name,
                        phone: detectedOrder.phone
                    },
                    "fulfillment": {
                        pickupTime: detectedOrder.pickup_time
                    }
                })
            });

            const toastResponse = await response.json();

            console.log('\n✅ Toast POS Response:');
            console.log(toastResponse);

        } catch (error) {
            console.error('\n❌ Error sending to Toast:', error.message);
        }
    } else {
        console.log('⚠️ TOAST_API_KEY or TOAST_LOCATION_ID not set — order NOT sent, only logged');
    }

    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
});

