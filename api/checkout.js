const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.VITE_APP_URL || 'https://app.btechaudit.com.br';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
    success_url: `${appUrl}/?subscribed=true`,
    cancel_url:  `${appUrl}/`,
    locale: 'pt-BR',
  });

  res.redirect(303, session.url);
};
