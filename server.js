// server.js v1.06 — includes: Toast + Supabase + dynamic hours + /voice redirect

const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// === Config ===
const TOAST_API_KEY = 'your-test-toast-api-key';
const TOAST_LOCATION_ID = 'test-location-id';
const TOAST_API_URL = `https://toast-api.example.com/locations/${TOAST_LOCATION_ID}/orders`;
const ELEVENLABS_MAIN_AGENT = 'agent_01jxztfvaqed3bk0wtd0wngpwj';
const ELEVENLABS_FALLBACK_AGENT = 'agent_01jyt5eyfvfqmbs6d8d2fgytbr';

const supabase = createClient(
  'https://wwtikqarqkgnxzwyqeur.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dGlrcWFycWtnbnh6d3lxZXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU1Njc1NywiZXhwIjoyMDY2MTMyNzU3fQ.6fIL5inBJfOKB5aO8GjXmXFIW-0V39n5PBzc_U_1pDA'
);

app.use(bodyParser.json({ limit: '10mb' }));

// === Restaurant hours config ===
const restaurantHours = {
  Monday: [],
  Tuesday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "21:30" } ],
  Wednesday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "21:30" } ],
  Thursday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "21:30" } ],
  Friday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "22:00" } ],
  Saturday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "22:00" } ],
  Sunday: [ { open: "11:00", close: "15:00" }, { open: "17:00", close: "21:30" } ]
};

function isPastCutoff(hours) {
  const now = new Date();
  const currentDay = now.toLocaleString("en-US", { weekday: "long" });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayShifts = hours[currentDay] || [];

  for (const shift of todayShifts) {
    const [openH, openM] = shift.open.split(":" ).map(Number);
    const [closeH, closeM] = shift.close.split(":" ).map(Number);
    const shiftStart = openH * 60 + openM;
    const shiftEnd = closeH * 60 + closeM;
    const cutoffTime = shiftEnd - 15;

    if (currentMinutes >= shiftStart && currentMinutes < cutoffTime) {
      return false; // Accepting orders
    }
  }
  return true; // Outside ordering window
}

// === /voice route for Twilio ===
app.get('/voice', (req, res) => {
  const useFallback = isPastCutoff(restaurantHours);
  const selectedAgentId = useFallback ? ELEVENLABS_FALLBACK_AGENT : ELEVENLABS_MAIN_AGENT;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>https://api.elevenlabs.io/twilio/inbound_call?agent_id=${selectedAgentId}</Redirect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

// === order extraction ===
function extractOrderFromTranscript(transcript) {
  const order = {
    customer_name: 'N/A',
    phone: 'N/A',
    items: [],
    pickup_time: 'N/A'
  };

  const itemKeywords = [
    'butter chicken', 'chicken biryani', 'shrimp fry',
    'shrimp biryani', 'tandoori chicken', 'mango lassi'
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
          order.items.push({ name: item, qty: 1 });
        }
      });
    }
  });

  return order.items.length > 0 ? order : null;
}

// === post-call webhook ===
app.post('/post-call', async (req, res) => {
  const data = req.body;
  console.log('✅ Webhook received');
  console.log('Call ID:', data?.data?.conversation_id);
  console.log('Transcript Status:', data?.data?.status);

  const transcript = data?.data?.transcript || [];
  transcript.forEach(turn => {
    if (turn.role && turn.message) {
      console.log(`${turn.role === 'agent' ? 'Agent' : 'Customer'}: "${turn.message}"`);
    }
  });

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
        body: JSON.stringify({ order: { ...detectedOrder } })
      });
      const result = await response.json();
      console.log('✅ Toast API Response:', result);
    } catch (err) {
      console.error('❌ Error sending order to Toast:', err.message);
    }

    try {
      const { error } = await supabase.from('orders').insert([{
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
  console.log(`✅ Server is listening on port ${port} (v1.06)`);
});

