const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));

// POST endpoint for ElevenLabs Post-Call webhook
app.post('/post-call', (req, res) => {
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

    // You can add logic here to save transcript to a file, DB, or send email/slack alert
    
    res.status(200).send('Webhook received');
});

app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
});

