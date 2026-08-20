'use client';
import { useState } from 'react';
import Link from 'next/link';

// Reviews page, ported from the reference. Client-side only because each card
// expands; the design-guard lives in the server wrapper next to this file.

const reviews = [
    {
      name: "Mishty M",
      location: "LOCAL GUIDE • 295 REVIEWS",
      source: "GOOGLE",
      initial: "M",
      color: "bg-[#174A91] text-white dark:bg-[#b41d24]",
      text: "It's been some time since I visited this part of the city, but I'm glad I did. Their pizza is outstanding here! My favorite was the tandoori style—absolutely delicious. Plus, the service was warm and welcoming. Food: 5/5 | Service: 5/5 | Atmosphere: 5/5"
    },
    {
      name: "Kastrotha Don",
      location: "4 REVIEWS",
      source: "GOOGLE",
      initial: "K",
      color: "bg-[#0b4221] text-white",
      text: "Great Place Food Fresh And Great Taste.....I ordered the meat lovers and it was 🔥 also ordered the Hawaiian chicken pizza it was pretty tasty as well definitely will be returning 🤙🤙🤙 100% halal I love this about them!!! You see meat lovers is gone completely. Food: 5/5 | Service: 5/5 | Atmosphere: 5/5"
    },
    {
      name: "Shuraim Ahmed",
      location: "1 REVIEW",
      source: "GOOGLE",
      initial: "S",
      color: "bg-[#C99700] text-white dark:bg-[#e6b95c] dark:text-[#0a0604]",
      text: "Mimi's Pizza is hands down the best! The crust is perfectly crispy, the cheese is fresh, and every bite is packed with flavor. Best part? It's 100% zabiha halal, so I can enjoy it with peace of mind. The staff is friendly, service is fast, and the quality is top-notch. My new favorite pizza spot! Food: 5/5 | Service: 5/5 | Atmosphere: 5/5"
    },
    {
      name: "i3 Gaming",
      location: "3 REVIEWS",
      source: "GOOGLE",
      initial: "i",
      color: "bg-[#174A91] text-white dark:bg-[#b41d24]",
      text: "Best Pizza place in Michigan! The Owner and employees are amazing and helpful! The pizza is absolutely amazing! I can't recommend enough! This place is a must try! Food: 5/5 | Service: 5/5 | Atmosphere: 5/5"
    },
    {
      name: "April Browning",
      location: "5 REVIEWS",
      source: "GOOGLE",
      initial: "A",
      color: "bg-[#0b4221] text-white",
      text: "Had the chicken alfredo pizza & cheese bread. Super yummy, first time customer but I will definitely be back the next time I'm craving pizza. Super friendly staff, reasonably priced, great taste & service. I would give it a 6/5 stars if possible (:"
    },
    {
      name: "Amna Tallat",
      location: "LOCAL GUIDE",
      source: "GOOGLE",
      initial: "A",
      color: "bg-[#C99700] text-white dark:bg-[#e6b95c] dark:text-[#0a0604]",
      text: "The location is primarily for takeout only and seating is limited (~2 small tables). We've tried the spicy chicken pizza, naga pizza, Mimi's yummy pizza and the cheesy garlic bread so far. Each of these was amazing but my favourite pizzas have got to be the spicy chicken pizza and Mimi's yummy pizza. This is the best halal pizza we've had in the area thus far and customer service has been great each time - we'll be repeat customers for a long time to come! Looking forward to trying other items on the menu."
    },
    {
      name: "Fahimul Islam",
      location: "LOCAL GUIDE",
      source: "GOOGLE",
      initial: "F",
      color: "bg-[#174A91] text-white dark:bg-[#b41d24]",
      text: "5/5 – A Hidden Gem in Madison Heights. I can't say enough good things about Mimi's Pizza in Madison Heights. We ordered the Ghost Pepper Naga Pizza and the Yummy Pizza, and both were absolutely incredible. The flavors were bold, fresh, and perfectly balanced. The Naga pizza had an amazing kick without overpowering the taste. It is honestly one of the best spicy pizzas I have ever had. This place is truly a hidden gem. The quality, flavor, and overall experience make it stand out from any other pizza spot in the area. If you are looking for something unique and delicious, Mimi's Pizza should be your go-to. Highly recommended!"
    },
    {
      name: "Mohammad Amin Roshani",
      location: "LOCAL GUIDE",
      source: "GOOGLE",
      initial: "M",
      color: "bg-[#0b4221] text-white",
      text: "We visited Mimi's Pizza and tried their Mimi Pizza and Gyro Pizza — both were absolutely delicious! The flavors were spot on, and the crust was perfect. They even gave us a free drink, which was such a nice surprise. The customer service was outstanding — everyone was so kind and welcoming. The atmosphere was great, and our order was ready quickly. Overall, it was a fantastic experience, and we'll definitely be coming back. Highly recommend Mimi's Pizza if you're in the area!"
    },
    {
      name: "Keleila Smith",
      location: "LOCAL GUIDE",
      source: "GOOGLE",
      initial: "K",
      color: "bg-[#C99700] text-white dark:bg-[#e6b95c] dark:text-[#0a0604]",
      text: "I ordered a tandoori burger, fries and wings. Everything is halal. The tandoori burger tasted exactly how I imagined when I ordered it! The wings were fresh, as in fresh chicken wings, seasoned to perfection and deep fried without batter to capture all the flavor. They tasted just like I had plucked them out of my fryer at home. I can't believe I've delayed my visit here for so long. To top it off they had a variety of ice cream popsicle sticks including my favorite, pistachio, a hard flavor to find in ice cream. I will definitely be back."
    },
    {
      name: "Ruma Taher",
      location: "GOOGLE REVIEW",
      source: "GOOGLE",
      initial: "R",
      color: "bg-[#174A91] text-white dark:bg-[#b41d24]",
      text: "The most amazing, delicious pizza! My go to shop, every time. Customer service is always top notch and they make you feel so welcomed every time you walk into the shop. Brothers Khalid and Farhan always do such an amazing job and go out of their way for their customers. Can't recommend this place enough!"
    },
    {
      name: "Nadia I.",
      location: "MADISON HEIGHTS",
      source: "GOOGLE",
      initial: "N",
      color: "bg-[#0b4221] text-white",
      text: "The MiMi's Special is a meal in itself. We ordered two large for a family gathering of 12 and barely had any leftovers. Tells you something."
    },
    {
      name: "Yusuf A.",
      location: "WARREN",
      source: "GOOGLE",
      initial: "Y",
      color: "bg-[#174A91] text-white dark:bg-[#b41d24]",
      text: "Best halal pizza in the Detroit area. Period."
    },
    {
      name: "Hassan T.",
      location: "WARREN",
      source: "GOOGLE",
      initial: "H",
      color: "bg-[#0b4221] text-white",
      text: "Staff at the Warren location are genuinely kind. Hot food, fast, and you can tell they care. That matters."
    }
];

function Star({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function ReviewCardFull({ review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 120;

  return (
    <div className="break-inside-avoid bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl p-8 shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none hover:shadow-[0_20px_40px_rgba(29,32,33,0.12)] dark:hover:bg-[#1f120c] transition-all duration-300 mb-6">
      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-3 h-3 text-[#C99700] dark:text-[#e6b95c]" />
        ))}
      </div>

      <p className={`text-base font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-snug mb-2 ${!expanded ? 'line-clamp-2' : ''}`}>
        &ldquo;{review.text}&rdquo;
      </p>

      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[#C99700] dark:text-[#e6b95c] text-xs font-bold tracking-widest uppercase hover:text-[#1D2021] dark:hover:text-[#f5ebd7] transition-colors mb-6"
        >
          {expanded ? 'Show less ↑' : '...Read more'}
        </button>
      ) : (
        <div className="mb-6" />
      )}

      <div className="flex items-center justify-between pt-6 border-t border-[rgba(29,32,33,0.1)] dark:border-white/5">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${review.color}`}>
            {review.initial}
          </div>
          <div>
            <div className="text-sm font-bold text-[#1D2021] dark:text-[#f5ebd7]">{review.name}</div>
            <div className="text-[9px] font-bold tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/50 uppercase">{review.location}</div>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full border border-[rgba(29,32,33,0.12)] dark:border-white/10 text-[9px] font-bold tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/50 uppercase bg-[#EAE4D5] dark:bg-transparent">
          {review.source}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsContent() {
  return (
    <div className="bg-[#F3EFE4] dark:bg-[#0a0604] pb-24">
      {/* Hero Section */}
              <section className="container mx-auto px-6 md:px-12 py-16">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                  <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Loved by Michigan Families</span>
                </div>
                
                <h1 className="text-6xl md:text-8xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] leading-[0.9] tracking-tight mb-8">
                  The reviews <span className="italic text-[#C99700] dark:text-[#e6b95c]">say it</span><br />
                  better than we can.
                </h1>
                
                <p className="text-[#3D4041] dark:text-[#f5ebd7]/80 text-lg md:text-xl max-w-2xl mb-16 leading-relaxed font-medium">
                  Real reviews from real Michigan families looking for fresh 100% Zabiha<br />
                  Halal pizza, burgers, and the kind of comfort food worth the drive.
                </p>
      
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-[#FFF9EC] dark:bg-gradient-to-br dark:from-[#3a1012] dark:to-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#174A91]/10 dark:bg-[#b41d24]/20 blur-3xl rounded-full"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-px w-6 bg-[#C99700] dark:bg-[#e6b95c]"></div>
                      <span className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase">Overall Rating</span>
                    </div>
                    <div className="flex items-baseline gap-4 mb-4">
                      <span className="text-6xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7]">4.8</span>
                      <Star className="w-12 h-12 fill-[#C99700] text-[#C99700] dark:fill-[#e6b95c] dark:text-[#e6b95c]" />
                    </div>
                    <div className="flex gap-1 mb-6">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-4 h-4 fill-[#C99700] text-[#C99700] dark:fill-[#e6b95c] dark:text-[#e6b95c]" />
                      ))}
                    </div>
                    <div className="text-[9px] font-bold tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/60 uppercase">
                      Across 1,200+ Reviews • Both Locations
                    </div>
                  </div>
      
                  {[
                    { source: "Google", rating: "4.8", count: "782 Reviews" },
                    { source: "Yelp", rating: "4.7", count: "214 Reviews" },
                    { source: "DoorDash", rating: "4.9", count: "2.3k Orders" }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-[#FFF9EC] dark:bg-[#1a0f0a] border border-[rgba(29,32,33,0.1)] dark:border-white/5 rounded-2xl p-8 flex flex-col justify-between shadow-[0_12px_30px_rgba(29,32,33,0.06)] dark:shadow-none">
                      <div className="text-[10px] font-bold tracking-widest text-[#C99700] dark:text-[#e6b95c] uppercase mb-12">
                        {stat.source}
                      </div>
                      <div>
                        <div className="text-5xl font-serif font-bold text-[#1D2021] dark:text-[#f5ebd7] mb-2">{stat.rating}</div>
                        <div className="text-[9px] font-bold tracking-widest text-[#5F625F] dark:text-[#f5ebd7]/60 uppercase">
                          {stat.count}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
      
              {/* Reviews Grid */}
              <section className="container mx-auto px-6 md:px-12 py-12">
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                  {reviews.map((review, idx) => (
                    <ReviewCardFull key={idx} review={review} />
                  ))}
                </div>
              </section>
      
              {/* Bottom CTA — Solid Royal Blue in Light Mode */}
              <section className="container mx-auto px-6 md:px-12 py-24">
                <div className="bg-[#174A91] dark:bg-gradient-to-br dark:from-[#2a1012] dark:to-[#120805] border border-white/10 dark:border-white/10 rounded-[2rem] p-12 md:p-24 text-center relative overflow-hidden shadow-xl">
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-8">
                      <div className="h-px w-8 bg-[#E0AE00] dark:bg-[#e6b95c]"></div>
                      <span className="text-[10px] font-bold tracking-widest text-[#E0AE00] dark:text-[#e6b95c] uppercase">Try MiMi's For Yourself</span>
                      <div className="h-px w-8 bg-[#E0AE00] dark:bg-[#e6b95c]"></div>
                    </div>
                    
                    <h2 className="text-5xl md:text-7xl font-bold text-white dark:text-[#f5ebd7] leading-tight tracking-tight mb-6">
                      Loved by <span className="font-serif italic text-[#E0AE00] dark:text-[#e6b95c]">Michigan families.</span><br />
                      Order yours next.
                    </h2>
                    
                    <p className="text-[#FFF9EC]/90 dark:text-[#f5ebd7]/80 text-lg max-w-2xl mx-auto mb-12 font-medium">
                      Sign up for MiMi's Online Rewards and get 50 bonus points on day one —<br />
                      most members hit their first reward by the third order.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <Link href="/contact" className="inline-flex items-center justify-center bg-[#C8102E] hover:bg-[#A80D27] text-white dark:bg-[#b41d24] dark:hover:bg-[#9a181e] rounded-full px-8 py-6 text-sm font-bold tracking-wider uppercase shadow-md transition-all">Order Online &rarr;</Link>
                      <Link href="/rewards" className="inline-flex items-center justify-center bg-[#E0AE00] hover:bg-[#C99700] text-[#1D2021] dark:bg-[#e6b95c] dark:hover:bg-[#d4a84d] dark:text-[#0a0604] rounded-full px-8 py-6 text-sm font-bold tracking-wider uppercase shadow-sm transition-all">Join Rewards</Link>
                    </div>
                  </div>
                </div>
              </section>
    </div>
  );
}
