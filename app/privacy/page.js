import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveDesign } from '@/lib/design';

// Privacy Policy, ported from the reference design.
//
// Only reachable while the reference design is live: the original design has no
// link to it and no equivalent page, so serving it there would strand visitors
// on a page with chrome that doesn't match the rest of the site.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Privacy Policy | Mimi's Pizza & Burger",
};

export default async function PrivacyPage() {
  if ((await getActiveDesign()) !== 'reference') notFound();

  return (
    <div className="bg-[#F3EFE4] dark:bg-[#0a0604]">
      <div className="pb-24">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                    <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Privacy Policy</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight tracking-tight mb-4">
                    Privacy Policy
                  </h1>
                  <p className="text-[#5F625F] dark:text-[#f5ebd7]/60 text-sm mb-12">Effective Date: 5/27/2026</p>
        
                  <div className="mimi-legal">
                    <p>
                      Welcome to MiMi’s Pizza & Burger (“MiMi’s,” “we,” “our,” or “us”). We value your privacy and are committed to protecting your information while providing a seamless online ordering and rewards experience.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">1. Information We Collect</h2>
                    <p>We may collect the following information when you interact with MiMi’s Pizza & Burger:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Name</li>
                      <li>Phone number</li>
                      <li>Email address</li>
                      <li>Order history and purchase information</li>
                      <li>Loyalty rewards activity</li>
                      <li>Website usage information (cookies, analytics)</li>
                    </ul>
                    <p>Information may be collected when you:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Place an order online</li>
                      <li>Join MiMi’s Online Rewards</li>
                      <li>Contact us by phone, text, or email</li>
                      <li>Subscribe to promotions or SMS updates</li>
                    </ul>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">2. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Process and fulfill food orders</li>
                      <li>Manage rewards and loyalty points</li>
                      <li>Send order confirmations and updates</li>
                      <li>Improve customer service and website experience</li>
                      <li>Provide promotions, special offers, and updates</li>
                      <li>Respond to questions or support requests</li>
                    </ul>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">3. Online Ordering & Third-Party Platforms</h2>
                    <p>
                      MiMi’s Pizza & Burger may work with third-party providers for ordering and payment processing, including but not limited to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Slice</li>
                      <li>Clover</li>
                    </ul>
                    <p>Information shared through these systems may be subject to their respective privacy policies.</p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">4. MiMi’s Online Rewards Program</h2>
                    <p>If you join MiMi’s Online Rewards, we may store:</p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Purchase history</li>
                      <li>Loyalty point balances</li>
                      <li>Reward redemption activity</li>
                      <li>Customer preferences</li>
                    </ul>
                    <p>This information helps us personalize offers and improve your rewards experience.</p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">5. SMS Communications</h2>
                    <p>
                      By providing your phone number, you agree to receive SMS messages from MiMi’s Pizza & Burger, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li>Order notifications</li>
                      <li>Loyalty/reward updates</li>
                      <li>Promotional offers</li>
                      <li>Birthday rewards</li>
                      <li>Special restaurant announcements</li>
                    </ul>
                    <p>Message & data rates may apply.</p>
                    <p>You may opt out at any time by replying: <strong>STOP</strong> to any text message.</p>
                    <p>For assistance, reply: <strong>HELP</strong></p>
                    <p>Consent to SMS marketing is not required to purchase food or services.</p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">6. Cookies & Analytics</h2>
                    <p>
                      Our website may use cookies and analytics tools to understand website traffic and improve user experience. You may disable cookies through your browser settings.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">7. Data Security</h2>
                    <p>
                      We take reasonable precautions to protect customer information; however, no online transmission is completely secure.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">8. Children’s Privacy</h2>
                    <p>
                      Our services are not directed toward children under 13 years old, and we do not knowingly collect information from children.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">9. Contact Us</h2>
                    <p>
                      For questions about this Privacy Policy, contact: <Link href="/contact" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">MiMi’s Pizza & Burger (Contact Page)</Link>.
                    </p>
                  </div>
                </div>
      </div>
    </div>
  );
}
