import Link from 'next/link';

// Terms of Service, ported from the reference design.
//
// Served under every design since 2026-10-25 (A2P campaign links point here).

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Terms of Service | Mimi's Pizza & Burger",
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  // Always served (2026-10-25). The A2P 10DLC campaigns link here; a 404
  // after a design switch would put the SMS registration at risk, so this
  // page no longer depends on which design is active.
  return (
    <div className="bg-[#F3EFE4] dark:bg-[#0a0604]">
      <div className="pb-24">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                    <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Terms of Service</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-4">
                    Terms of Service
                  </h1>
                  <p className="text-[#5F625F] dark:text-[#f5ebd7]/60 text-sm mb-12">Effective Date: 5/27/2026 · Updated 10/25/2026</p>
                  
                  <div className="mimi-legal">
                    <p>
                      Welcome to MiMi’s Pizza &amp; Burger, operated by <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong>. By using our website, placing orders, or participating in MiMi’s Online Rewards, you agree to the following Terms of Service.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">1. Online Ordering</h2>
                    <p>MiMi’s Pizza &amp; Burger provides online ordering for customer convenience.</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Menu items, pricing, promotions, and availability may change at any time without notice.</li>
                      <li>We reserve the right to refuse or cancel orders at our discretion.</li>
                    </ul>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">2. No Refund Policy</h2>
                    <p><strong>ALL SALES ARE FINAL.</strong></p>
                    <p>Due to the perishable nature of food products, MiMi’s Pizza &amp; Burger does not offer refunds once an order has been prepared or fulfilled.</p>
                    <p>If there is an issue with your order, please contact the restaurant directly. We may attempt to resolve concerns at our discretion.</p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">3. MiMi’s Online Rewards Program</h2>
                    <h3 className="text-xl mt-6 mb-2 font-bold">Earning Points</h3>
                    <ul className="list-disc pl-6 space-y-2 mb-4 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Customers may earn loyalty points through qualifying purchases.</li>
                      <li>Points may vary based on promotions and purchases.</li>
                    </ul>
                    <h3 className="text-xl mt-6 mb-2 font-bold">Reward Redemption</h3>
                    <p>Rewards may be redeemed online based on available point balances.</p>
                    <p>Rules:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-4 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>One reward per order</li>
                      <li>Rewards cannot be exchanged for cash</li>
                      <li>Points have no cash value</li>
                      <li>Rewards may not be transferred between customers</li>
                    </ul>
                    <p>MiMi’s Pizza &amp; Burger reserves the right to modify or discontinue rewards at any time.</p>
                    <h3 className="text-xl mt-6 mb-2 font-bold">Abuse of Rewards</h3>
                    <p>Fraudulent activity, manipulation, duplicate accounts, or misuse of rewards may result in suspension or removal from the loyalty program.</p>

                    <h2 className="text-2xl mt-10 mb-4 font-bold">4. SMS Communications &amp; Consent</h2>
                    {/* Rewritten 2026-10-25 for A2P 10DLC (CHATBOT_SPEC.md). */}
                    <p>
                      <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong> offers optional SMS text messages for order confirmations and updates, rewards updates, and promotions.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li><strong>How you opt in:</strong> by checking the SMS consent boxes in our website chat, on our contact form, at online checkout, or when joining MiMi&rsquo;s Rewards. If you order by phone, you may agree verbally to receive order-related texts only.</li>
                      <li><strong>Promotional texts</strong> need their own separate consent (the &ldquo;Text me deals and rewards&rdquo; box). Consent is never a condition of purchase.</li>
                      <li><strong>Message frequency:</strong> order texts vary with your orders; promotional texts are up to 4 messages per month. Messages may be sent using automated means.</li>
                      <li>Message and data rates may apply.</li>
                      <li><strong>Opt out:</strong> reply <strong>STOP</strong> to any message at any time. <strong>Help:</strong> reply <strong>HELP</strong> or email <a href="mailto:info@mimispizzami.com" className="underline">info@mimispizzami.com</a>.</li>
                      <li>Carriers are not liable for delayed or undelivered messages.</li>
                    </ul>
                    <p>
                      How we handle your number and consent is described in our <Link href="/privacy" className="underline">Privacy Policy</Link>.
                    </p>

                    <h2 className="text-2xl mt-10 mb-4 font-bold">5. Limitation of Liability</h2>
                    <p>
                      We reserve the right to update these Terms at any time. Continued use of our services constitutes acceptance of updated terms.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">6. Governing Law</h2>
                    <p>
                      These Terms shall be governed by the laws of the State of Michigan.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">7. Contact Information</h2>
                    <p>
                      For questions regarding these Terms, contact <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong> at{' '}
                      <a href="mailto:info@mimispizzami.com" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">info@mimispizzami.com</a>
                      {' '}or via our <Link href="/contact" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">contact page</Link>.
                    </p>
                  </div>
                </div>
      </div>
    </div>
  );
}
