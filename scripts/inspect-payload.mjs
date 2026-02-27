// scripts/inspect-payload.mjs
// Fetches abandoned checkouts and prints the full raw payload — NO Klaviyo dispatch.
// Run with: node scripts/inspect-payload.mjs

import dotenv from 'dotenv';
dotenv.config();

import { fetchYesterdaysAbandonedCheckouts } from '../src/shopify/abandonedCheckouts.js';

console.log('='.repeat(60));
console.log('  INSPECT: Abandoned Checkouts Raw Payload');
console.log('='.repeat(60));

const checkouts = await fetchYesterdaysAbandonedCheckouts();

if (!checkouts.length) {
    console.log('\n⚠️  Nenhum checkout abandonado encontrado para ontem.');
    process.exit(0);
}

console.log(`\n✅ ${checkouts.length} checkout(s) encontrado(s):\n`);

checkouts.forEach((checkout, i) => {
    console.log(`${'─'.repeat(60)}`);
    console.log(`📦 Checkout ${i + 1} de ${checkouts.length}`);
    console.log(`${'─'.repeat(60)}`);

    // Summary view
    console.log(`  ID:            ${checkout.id}`);
    console.log(`  Email:         ${checkout.email || '(sem email)'}`);
    console.log(`  Nome:          ${checkout.billing_address?.first_name || ''} ${checkout.billing_address?.last_name || ''}`);
    console.log(`  Telefone:      ${checkout.phone || '(sem telefone)'}`);
    console.log(`  Total:         ${checkout.total_price} ${checkout.currency}`);
    console.log(`  Criado em:     ${checkout.created_at}`);
    console.log(`  Atualizado em: ${checkout.updated_at}`);
    console.log(`  Recovery URL:  ${checkout.abandoned_checkout_url || '(não disponível)'}`);
    console.log(`\n  Produtos no carrinho:`);

    (checkout.line_items || []).forEach((item, j) => {
        console.log(`    ${j + 1}. ${item.title} — ${item.quantity}x — ${item.price} ${checkout.currency}`);
    });

    console.log('\n  📄 RAW PAYLOAD COMPLETO:');
    console.log(JSON.stringify(checkout, null, 2));
    console.log('');
});
