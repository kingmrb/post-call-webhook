// v1.05-clean — Original Toast + Supabase Save — no /voice

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

const TOAST_API_KEY = 'your-test-toast-api-key';
const TOAST_LOCATION_ID = 'test-location-id';
const TOAST_API_URL = `https://toast-api.example.com/locations/${TOAST_LOCATION_ID}/orders`;


const supabase = createClient(
  'https://wwtikqarqkgnxzwyqeur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dGlrcWFycWtnbnh6d3lxZXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU1Njc1NywiZXhwIjoyMDY2MTMyNzU3fQ.6fIL5inBJfOKB5aO8GjXmXFIW-0V39n5PBzc_U_1pDA'
);


app.use(bodyParser.json({ limit: '10mb' }));

function extractOrderFromTranscript(transcript) {
  const order = {
    customer_name: 'N/A',
    phone: 'N/A',
    items: [],
    pickup_time: 'N/A'
  };

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
      if (/my name is/i.test(msg)) {
        const match = msg.match(/my name is\s+([a-zA-Z\s]+)/i);
        if (match) order.customer_name = match[1].trim();
      }

      if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(msg)) {
        const match = msg.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
        if (match) order.phone = match[1].trim();
      }

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

    try {
      const { error } = await supabase
        .from('orders')
        .insert([{
          customer_name: detectedOrder.customer_name,
          phone_number: detectedOrder.phone,
          items: detectedOrder.items,
          pickup_time: detectedOrder.pickup_time,
          source: "James"
        }]);

      if (error) {
        console.error('❌ Error saving order to Supabase:', error);
      } else {
        console.log('✅ Order saved to Supabase');
      }
    } catch (err) {
      console.error('❌ Supabase error:', err.message);
    }
  }

  res.status(200).send('Webhook received');
});

app.listen(port, () => {
  console.log(`✅ Server is listening on port ${port} (version 1.05-clean)`);
});

