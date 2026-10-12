/** Public dummy inputs only. Never creates an executable quote or sends funds. */
import { writeFile } from 'node:fs/promises';
import { verifyQuoteSignature } from '@defuse-protocol/one-click-sdk-typescript';
const request = {
  dry: true, swapType: 'EXACT_INPUT', slippageTolerance: 100,
  originAsset: 'nep141:zec.omft.near', depositType: 'ORIGIN_CHAIN',
  destinationAsset: 'nep141:eth.omft.near', amount: '10000000',
  refundTo: 't1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs', refundType: 'ORIGIN_CHAIN',
  recipient: '0x0000000000000000000000000000000000000001', recipientType: 'DESTINATION_CHAIN',
  deadline: new Date(Date.now() + 3600000).toISOString(),
};
// The fixture's publicly generated, checksum-valid dummy address is reused.
const fixture = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../test/fixtures/evidence/oneclick-live-dry-quote.json', import.meta.url), 'utf8'));
request.refundTo = fixture.quoteRequest.refundTo;
const response = await fetch('https://1click.chaindefuser.com/v0/quote', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request), signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Dry-quote service returned HTTP ${response.status}`);
const record = await response.json();
if (!verifyQuoteSignature(record) || record.quoteRequest.dry !== true || record.quote?.depositAddress) throw new Error('Expected a valid signed dry quote without a deposit address.');
const out = process.argv[2] ?? 'oneclick-dry-quote.json';
await writeFile(out, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(`Saved authenticated dry quote to ${out}. No transaction was executed.`);
