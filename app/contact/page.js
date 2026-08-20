import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActiveDesign } from '@/lib/design';

// Contact page, ported from the reference design.
//
// Two changes from the reference, both because this is the live storefront:
// the "Start Order" buttons pointed at two legacy websites and now reach /menu,
// and the "Call" buttons are real tel: links. The GHL enquiry form is kept
// exactly as the reference had it.

export const dynamic = 'force-dynamic';
export const metadata = { title: "Contact | Mimi's Pizza & Burger" };

export default async function ContactPage() {
  if ((await getActiveDesign()) !== 'reference') notFound();

  return (
    <div className="bg-[#F3EFE4] dark:bg-[#0a0604] pb-24">
      {/* Hero Section */}
              <section className="container mx-auto px-6 md:px-12 py-16">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                  <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Order Online • Get In Touch</span>
                </div>
                
                <h1 className="text-6xl md:text-8xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-[0.9] tracking-tight mb-8">
                  Choose your<br />
                  <span className="italic text-[#C99700] dark:text-[#e6b95c]">MiMi's</span> Kitchen.
                </h1>
                
                <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-lg md:text-xl max-w-2xl mb-16 leading-relaxed font-medium">
                  Pick the location closest to you and start your order — pickup ready in 20<br />
                  minutes, delivery within 5 miles. Or scroll down to drop us a message.
                </p>
      
                <div className="flex justify-center mb-12">
                  <div className="inline-flex bg-[#EAE4D5] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/10 rounded-full p-1 shadow-inner">
                    {['Pickup', 'Delivery', 'Dine-In', 'Catering'].map((mode, idx) => (
                      <span
                        key={mode}
                        className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                          idx === 0 ? 'bg-[#C8102E] text-white dark:bg-[#e6b95c] dark:text-[#0a0604] shadow-sm' : 'text-[#5F625F] dark:text-[#f5ebd7]/60'
                        }`}
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>
      
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Madison Heights Card */}
                  <div className="bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl overflow-hidden relative group shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] transition-all duration-300">
                    <div className="p-10 border-b border-[rgba(29,32,33,0.1)] dark:border-white/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-px w-6 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                        <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Location 01</span>
                      </div>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-2">Madison Heights</h2>
                      <p className="text-[#5F625F] dark:text-[#f5ebd7]/70 text-sm mb-6">28931 John R Rd, Madison Heights, MI 48071</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-[#0b4221] dark:text-[#10b981]">
                        <div className="w-2 h-2 rounded-full bg-[#0b4221] dark:bg-[#10b981]"></div>
                        Open • Pickup Ready in 20 Min
                      </div>
                    </div>
                    
                    <div className="p-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        <div>
                          <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Hours</div>
                          <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold text-sm leading-relaxed">
                            Sun-Thu: 11:30 AM - 10:30 PM<br />
                            Fri: 3:00 PM - 11:00 PM<br />
                            Sat: 11:30 AM - 11:00 PM
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Phone</div>
                            <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold text-sm">(248) 677-4355</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Wait</div>
                            <div className="text-[#0b4221] dark:text-[#10b981] font-bold text-sm">~ 20 min</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <Link href="/menu" className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#b41d24] dark:hover:bg-[#9a181e] rounded-full px-6 py-5 text-xs font-bold tracking-wider uppercase shadow-md transition-all">Start Order &rarr;</Link>
                        <a href="tel:+12486774355" className="inline-flex items-center justify-center border-[rgba(29,32,33,0.2)] text-[#1D2021] dark:text-[#f5ebd7] dark:border-white/20 hover:bg-[#EAE4D5] hover:text-[#1D2021] dark:hover:bg-white/5 rounded-full px-6 py-5 text-xs font-bold tracking-wider uppercase bg-[#FFF9EC] dark:bg-transparent">Call</a>
                      </div>
                    </div>
                  </div>
      
                  {/* Warren Card */}
                  <div className="bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl overflow-hidden relative group shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] transition-all duration-300">
                    <div className="p-10 border-b border-[rgba(29,32,33,0.1)] dark:border-white/5">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-px w-6 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                        <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Location 02</span>
                      </div>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-2">Warren</h2>
                      <p className="text-[#5F625F] dark:text-[#f5ebd7]/70 text-sm mb-6">8113 E 9 Mile Rd, Warren, MI 48089</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-[#0b4221] dark:text-[#10b981]">
                        <div className="w-2 h-2 rounded-full bg-[#0b4221] dark:bg-[#10b981]"></div>
                        Open • Pickup Ready in 20 Min
                      </div>
                    </div>
                    
                    <div className="p-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        <div>
                          <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Hours</div>
                          <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold text-sm leading-relaxed">
                            Sun-Thu: 12:00 PM - 10:00 PM<br />
                            Fri: 3:00 PM - 10:30 PM<br />
                            Sat: 12:00 PM - 10:30 PM
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Phone</div>
                            <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold text-sm">(586) 619-7126</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-2">Wait</div>
                            <div className="text-[#0b4221] dark:text-[#10b981] font-bold text-sm">~ 20 min</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <Link href="/menu" className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#b41d24] dark:hover:bg-[#9a181e] rounded-full px-6 py-5 text-xs font-bold tracking-wider uppercase shadow-md transition-all">Start Order &rarr;</Link>
                        <a href="tel:+15866197126" className="inline-flex items-center justify-center border-[rgba(29,32,33,0.2)] text-[#1D2021] dark:text-[#f5ebd7] dark:border-white/20 hover:bg-[#EAE4D5] hover:text-[#1D2021] dark:hover:bg-white/5 rounded-full px-6 py-5 text-xs font-bold tracking-wider uppercase bg-[#FFF9EC] dark:bg-transparent">Call</a>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
      
              {/* 4 Steps Section */}
              <section className="py-24 bg-[#EAE4D5]/50 dark:bg-[#110a08] border-y border-[rgba(29,32,33,0.1)] dark:border-white/5">
                <div className="container mx-auto px-6 md:px-12">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                    <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">How Ordering Works</span>
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                  </div>
                  
                  <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] text-center leading-tight tracking-tight mb-16">
                    From <span className="italic text-[#C99700] dark:text-[#e6b95c]">tap to table,</span><br />
                    in 4 steps.
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { num: "01", title: "Pick your spot", desc: "Choose Madison Heights or Warren — both serve the full menu." },
                      { num: "02", title: "Build your order", desc: "Customize toppings, sizes, sauces. Add a deal for the family." },
                      { num: "03", title: "Apply rewards", desc: "Tap to redeem any available reward. Earn points on every $1." },
                      { num: "04", title: "Eat. Repeat.", desc: "Pickup in 20, delivery in 35. Hot, halal, ready when you are." }
                    ].map((step, idx) => (
                      <div key={idx} className="bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl p-8 shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] dark:hover:bg-[#1f120c] transition-all duration-300">
                        <div className="text-4xl font-serif font-bold text-[#C99700] dark:text-[#e6b95c] mb-6">{step.num}</div>
                        <h3 className="text-xl font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-3">{step.title}</h3>
                        <p className="text-[#3D4041] dark:text-[#f5ebd7]/70 text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
      
              {/* Contact Form Section */}
              <section className="py-24 bg-[#F3EFE4] dark:bg-[#0a0604]">
                <div className="container mx-auto px-2 md:px-12">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                    <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Get In Touch</span>
                    <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                  </div>
                  
                  <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] text-center leading-tight tracking-tight mb-16">
                    Questions, catering, <span className="italic text-[#C99700] dark:text-[#e6b95c]">or<br />a quick hello.</span>
                  </h2>
                  
                  <div className="bg-[#FFF9EC] dark:bg-[#110a08] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-3xl p-0 md:p-8 overflow-hidden shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none -mx-2 md:mx-0">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-12">
                      <div className="lg:col-span-2 px-6 md:px-0 pt-8 md:pt-0">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="h-px w-6 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                          <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Reach Us Directly</span>
                        </div>
                        
                        <h3 className="text-4xl md:text-5xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-tight mb-6">
                          Real humans.<br />
                          Same-day <span className="italic text-[#C99700] dark:text-[#e6b95c]">replies.</span>
                        </h3>
                        
                        <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-sm leading-relaxed mb-10 font-medium">
                          We respond to every message within the day. For urgent orders or live questions, give the location a call — we'll pick up.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="bg-[#F3EFE4] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-[#174A91]/10 dark:bg-[#b41d24]/20 flex items-center justify-center text-[#174A91] dark:text-[#b41d24] font-bold">☎</div>
                            <div>
                              <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-1">Madison Heights</div>
                              <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold">(248) 677-4355</div>
                            </div>
                          </div>
                          <div className="bg-[#F3EFE4] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-xl p-6 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-[#0b4221]/10 dark:bg-[#0b4221]/20 flex items-center justify-center text-[#0b4221] dark:text-[#10b981] font-bold">☎</div>
                            <div>
                              <div className="text-[9px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-1">Warren</div>
                              <div className="text-[#1D2021] dark:text-[#f5ebd7] font-bold">(586) 619-7126</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-3 w-full px-0 min-w-0">
                        <iframe
                          src="https://api.leadconnectorhq.com/widget/form/fWvRC8cYY47errwDYbjI"
                          style={{ width: "100%", border: "none", borderRadius: "4px", overflow: "hidden" }}
                          className="min-h-[1050px] md:min-h-[987px] w-full"
                          scrolling="no"
                          id="inline-fWvRC8cYY47errwDYbjI"
                          data-layout="{'id':'INLINE'}"
                          data-trigger-type="alwaysShow"
                          data-trigger-value=""
                          data-activation-type="alwaysActivated"
                          data-activation-value=""
                          data-deactivation-type="neverDeactivate"
                          data-deactivation-value=""
                          data-form-name="Website Inquiry"
                          data-height="987"
                          data-layout-iframe-id="inline-fWvRC8cYY47errwDYbjI"
                          data-form-id="fWvRC8cYY47errwDYbjI"
                          title="Website Inquiry"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
    </div>
  );
}
