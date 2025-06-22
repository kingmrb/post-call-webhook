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
  'https://YOUR_PROJECT_URL.supabase.co',
  'YOUR_SUPABASE_SERVICE_KEY'
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

