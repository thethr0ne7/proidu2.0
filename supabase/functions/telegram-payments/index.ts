const BOT_API = 'https://api.telegram.org';
const PRICE_STARS = 149;

async function telegram(method: string, payload: unknown) {
  const token = Deno.env.get('BOT_TOKEN');
  if (!token) throw new Error('BOT_TOKEN is not configured');
  const res = await fetch(`${BOT_API}/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description ?? `Telegram ${method} failed`);
  return json.result;
}

Deno.serve(async (req) => {
  const update = await req.json();
  if (update.pre_checkout_query) {
    await telegram('answerPreCheckoutQuery', { pre_checkout_query_id: update.pre_checkout_query.id, ok: true });
    return Response.json({ ok: true });
  }
  if (update.message?.successful_payment) {
    // Persist payment before delivery in production via service-role Supabase client.
    return Response.json({ ok: true, paid: true });
  }
  const body = update.action ? update : null;
  if (body?.action === 'create_invoice') {
    const invoice = await telegram('createInvoiceLink', {
      title: 'Полный маршрут поступления',
      description: 'Совместимые программы, приоритеты подачи, дедлайны, документы и расчёт индивидуальных достижений.',
      payload: `full_route:${crypto.randomUUID()}`,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'Полный маршрут', amount: PRICE_STARS }],
    });
    return Response.json({ invoiceUrl: invoice });
  }
  return Response.json({ ok: true });
});
