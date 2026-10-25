import Link from 'next/link';

// Privacy Policy, ported from the reference design.
//
// Served under every design since 2026-10-25 (A2P campaign links point here).

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Privacy Policy | Mimi's Pizza & Burger",
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  // Always served (2026-10-25). The A2P 10DLC campaigns link here; a 404
  // after a design switch would put the SMS registration at risk, so this
  // page no longer depends on which design is active.
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
                  <p className="text-[#5F625F] dark:text-[#f5ebd7]/60 text-sm mb-12">Effective Date: 5/27/2026 · Updated 10/25/2026</p>
                  
                  <div className="mimi-legal">
                    <p>
                      Welcome to MiMi’s Pizza &amp; Burger, operated by <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong> (“MiMi’s,” “we,” “our,” or “us”). We value your privacy and are committed to protecting your information while providing a seamless online ordering and rewards experience.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">1. Information We Collect</h2>
                    <p>We may collect the following information when you interact with MiMi’s Pizza &amp; Burger:</p>
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
                      <li>Contact us by phone, text, email or our website chat</li>
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
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">3. Online Ordering &amp; Third-Party Platforms</h2>
                    <p>
                      MiMi’s Pizza &amp; Burger may work with third-party providers for ordering and payment processing, including but not limited to:
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
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">5. SMS Communications &amp; Consent</h2>
                    {/* Rewritten 2026-10-25 for A2P 10DLC (CHATBOT_SPEC.md). This is
                        the paragraph a carrier reviewer reads to decide whether the
                        registered brand matches the site, so the entity is named
                        here, consent is opt-in only, and the no-sharing statement
                        carriers require is below. */}
                    <p>
                      <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong> offers optional text messages. We text you only if you choose to receive them:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-6 text-[#3D4041] dark:text-[#f5ebd7]/80">
                      <li><strong>Order texts</strong> (order confirmations, order status, pickup and delivery updates, and replies to your questions) &mdash; only if you check the &ldquo;Text me about my orders&rdquo; box, or agree out loud when you order by phone. Message frequency varies with your orders.</li>
                      <li><strong>Deals and rewards texts</strong> (offers, rewards and announcements) &mdash; only if you check the separate &ldquo;Text me deals and rewards&rdquo; box. Up to 4 messages per month.</li>
                    </ul>
                    <p>
                      You can check these boxes in our website chat, on our contact form, at online checkout, or when you join MiMi&rsquo;s Rewards. Both boxes start unchecked, and neither is required: consent is not a condition of purchase. Messages may be sent using automated means. Message and data rates may apply.
                    </p>
                    <p>Reply <strong>STOP</strong> to any text to opt out at any time. Reply <strong>HELP</strong> for help, or email <a href="mailto:info@mimispizzami.com" className="underline">info@mimispizzami.com</a>. Carriers are not liable for delayed or undelivered messages.</p>
                    <p>We record the date, time, page and wording of every opt-in and opt-out so we can honor your choice.</p>
                    <p>
                      <strong>We do not share or sell mobile phone numbers or SMS opt-in data with third parties or affiliates for marketing or promotional purposes.</strong> Text messaging originator opt-in data and consent will not be shared with any third parties, except the providers that deliver our messages on our behalf.
                    </p>

                    <h2 className="text-2xl mt-10 mb-4 font-bold">6. Email</h2>
                    {/* Added 2026-10-25 with customer email. Order emails are
                        transactional; offers only with the separate, unticked
                        opt-in at checkout or rewards sign-up. */}
                    <p>
                      If you give us your email address when you order, we send your receipt and updates about that order. We send offers, rewards updates and menu news by email only if you tick the box asking for them. Ticking it is never required to order.
                    </p>
                    <p>Every offer email has an <strong>Unsubscribe</strong> link; one click stops offer emails to that address. Receipts and order updates still arrive for orders you place.</p>
                    <p>We record when and where you opted in or out, so we can respect your choice. We never sell or share your email address with third parties for their marketing. Emails are sent through our email provider on our behalf.</p>

                    <h2 className="text-2xl mt-10 mb-4 font-bold">7. Cookies & Analytics</h2>
                    <p>
                      Our website may use cookies and analytics tools to understand website traffic and improve user experience. You may disable cookies through your browser settings.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">8. Data Security</h2>
                    <p>
                      We take reasonable precautions to protect customer information; however, no online transmission is completely secure.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">9. Children’s Privacy</h2>
                    <p>
                      Our services are not directed toward children under 13 years old, and we do not knowingly collect information from children.
                    </p>
        
                    <h2 className="text-2xl mt-10 mb-4 font-bold">10. Contact Us</h2>
                    {/* A reachable email, not only a contact-page link. Carrier
                        vetting for SMS expects a direct contact route on the
                        policy itself, and a link to another page is not one. */}
                    <p>
                      For questions about this Privacy Policy, contact <strong>Khidma Brothers LLC d/b/a MiMi’s Pizza &amp; Burger</strong> at{' '}
                      <a href="mailto:info@mimispizzami.com" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">info@mimispizzami.com</a>
                      {' '}or via our <Link href="/contact" className="text-[#C8102E] dark:text-[#e6b95c] hover:underline font-semibold">contact page</Link>.
                    </p>
                  </div>
                </div>
      </div>
    </div>
  );
}
