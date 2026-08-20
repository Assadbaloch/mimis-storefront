import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveDesign } from '@/lib/design';

// Terms of Service, ported from the reference design.
//
// Only reachable while the reference design is live: the original design has no
// link to it and no equivalent page, so serving it there would strand visitors
// on a page with chrome that doesn't match the rest of the site.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Terms of Service | Mimi's Pizza & Burger",
};

export default async function TermsPage() {
  if ((await getActiveDesign()) !== 'reference') notFound();

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
                  <p className="text-[#5F625F] dark:text-[#f5ebd7]/60 text-sm mb-12">Effective Date: 5/27/2026</p>
        
                  <div className="mimi-legal">
                    <p>
                      Welcome to MiMi’s Pizza & Burger. By using our website, placing orders, or participating in MiMi’s Online Rewards, you agree to the following Terms of Service.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">1. Online Ordering</h2>
                    <p>MiMi’s Pizza & Burger provides online ordering for customer convenience.</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Menu items, pricing, promotions, and availability may change at any time without notice.</li>
                      <li>We reserve the right to refuse or cancel orders at our discretion.</li>
                    </ul>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">2. No Refund Policy</h2>
                    <p><strong>ALL SALES ARE FINAL.</strong></p>
                    <p>
                      Due to the perishable nature of food products, MiMi’s Pizza & Burger does not offer refunds once an order has been prepared or fulfilled.
                    </p>
                    <p>
                      If there is an issue with your order, please contact the restaurant directly. We may attempt to resolve concerns at our discretion.
                    </p>
        
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
                    <p>MiMi’s Pizza & Burger reserves the right to modify or discontinue rewards at any time.</p>
        
                    <h3 className="text-xl mt-6 mb-2 font-bold">Abuse of Rewards</h3>
                    <p>
                      Fraudulent activity, manipulation, duplicate accounts, or misuse of rewards may result in suspension or removal from the loyalty program.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">4. SMS Communications & Consent</h2>
                    <p>
                      By providing your phone number, you consent to receive text communications from MiMi’s Pizza & Burger, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Order notifications</li>
                      <li>Promotions and discounts</li>
                      <li>Rewards updates</li>
                      <li>Birthday rewards</li>
                      <li>Customer service messages</li>
                    </ul>
                    <p>Message and data rates may apply.</p>
                    <p>You may opt out anytime by replying: <strong>STOP</strong></p>
                    <p>For assistance: <strong>HELP</strong></p>
                    <p>Consent to SMS communication is not a condition of purchase.</p>
        
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
                      For questions regarding these Terms, contact: <Link href="/contact" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">MiMi’s Pizza & Burger (Contact Page)</Link>.
                    </p>
                  </div>
                </div>
      </div>
    </div>
  );
}
