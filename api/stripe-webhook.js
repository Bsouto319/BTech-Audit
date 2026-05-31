const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig    = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Usa anon key + funções security definer (sem precisar da service role key)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  if (event.type === 'checkout.session.completed') {
    const session    = event.data.object;
    const email      = session.customer_email || session.customer_details?.email;
    const customerId = session.customer;
    const subId      = session.subscription;

    if (email) {
      await supabase.rpc('audit_update_subscription', {
        p_email:       email,
        p_status:      'active',
        p_customer_id: customerId,
        p_sub_id:      subId,
      });
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object;
    await supabase.rpc('audit_cancel_subscription', { p_sub_id: sub.id });
  }

  res.json({ received: true });
};
