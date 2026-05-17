import React, { useState } from 'react';
import { Search, Users, Bell, MessageCircle, ChevronRight, Briefcase, MapPin, Filter, ArrowRight, Check, Building2, Calendar, FileText, Zap, BadgeCheck, Quote, ArrowUpRight, Lightbulb, Wrench, Compass, Send, Clock, Award, BookOpen, TrendingUp, Eye } from 'lucide-react';

export default function CoFoundPrototype() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [filterRole, setFilterRole] = useState('All');
  const [filterIntent, setFilterIntent] = useState('All');

  // Sample founders with the NEW role-based model
  const founders = [
    {
      id: 1,
      name: 'Niran Suksawat', age: 28,
      iAm: 'Technical',
      bringing: 'idea',
      lookingFor: ['Business', 'Marketing'],
      industry: 'FinTech',
      stage: 'Building MVP',
      location: 'Bangkok',
      commitment: 'Full-time',
      runway: '12 months',
      experience: '1-2 ventures',
      pitch: 'I\'m building a B2B SaaS for Thai SMEs to manage payroll, social security, and tax compliance. Currently in MVP stage with 3 pilot customers. Looking for a commercial co-founder with strong B2B sales experience in the SME segment.',
      skills: ['Full-stack', 'AWS', 'FinTech Systems', 'Product'],
      complement: 94,
      image: '👨‍💻'
    },
    {
      id: 2,
      name: 'Praewa Chai', age: 31,
      iAm: 'Business',
      bringing: 'idea',
      lookingFor: ['Technical', 'Product'],
      industry: 'E-commerce',
      stage: 'Have traction',
      location: 'Chiang Mai',
      commitment: 'Full-time',
      runway: '18+ months',
      experience: '3+ ventures',
      pitch: 'Ex-Lazada growth lead. Building an AI-powered logistics optimization platform for Thai D2C brands. Have 5 paying customers and ฿120K MRR. Need a technical co-founder to lead engineering and scale the product.',
      skills: ['Growth', 'Operations', 'Fundraising', 'B2B Sales'],
      complement: 89,
      image: '👩‍💼'
    },
    {
      id: 3,
      name: 'Apinya Wongsa', age: 26,
      iAm: 'Product',
      bringing: 'open',
      lookingFor: ['Technical', 'Business'],
      industry: 'HealthTech',
      stage: 'Just exploring',
      location: 'Bangkok',
      commitment: 'Full-time',
      runway: '6 months',
      experience: 'First-time',
      pitch: 'Senior product designer with 500K+ users on past consumer apps. Passionate about healthcare access in SEA. Open to joining a healthtech or consumer venture with strong technical and commercial founders. Want to build something that matters.',
      skills: ['Product Design', 'UX Research', 'Strategy', 'Figma'],
      complement: 87,
      image: '👩‍🎨'
    },
    {
      id: 4,
      name: 'Suttipong Lee', age: 34,
      iAm: 'Business',
      bringing: 'idea',
      lookingFor: ['Technical'],
      industry: 'PropTech',
      stage: 'Building MVP',
      location: 'Bangkok',
      commitment: 'Full-time',
      runway: '12 months',
      experience: '1-2 ventures',
      pitch: 'Ex-CBRE commercial real estate. Building a marketplace for SME office space rentals in Bangkok with flexible terms. LOIs from 12 landlords representing 40K sqm. Need a CTO who can build a two-sided marketplace from scratch.',
      skills: ['Real Estate', 'B2B Sales', 'Operations', 'Negotiations'],
      complement: 91,
      image: '👨‍💼'
    },
    {
      id: 5,
      name: 'Mint Tantirat', age: 29,
      iAm: 'Technical',
      bringing: 'open',
      lookingFor: ['Business', 'Domain Expert'],
      industry: 'AI / B2B SaaS',
      stage: 'Just exploring',
      location: 'Remote OK',
      commitment: 'Full-time',
      runway: '12 months',
      experience: 'First-time',
      pitch: 'ML engineer with 6 years at Agoda. Specialty in LLM applications and data pipelines. Open to joining a B2B SaaS or vertical AI venture with a commercial co-founder who has domain expertise. Strong preference for SEA-focused problems.',
      skills: ['Python', 'ML/AI', 'LLMs', 'Data Engineering'],
      complement: 85,
      image: '👨‍🔬'
    },
    {
      id: 6,
      name: 'Boom Charoenkij', age: 27,
      iAm: 'Marketing',
      bringing: 'explore',
      lookingFor: ['Technical', 'Product'],
      industry: 'Consumer Tech',
      stage: 'Just exploring',
      location: 'Bangkok',
      commitment: 'Part-time',
      runway: '6 months',
      experience: 'First-time',
      pitch: 'Growth marketer at Shopee for 4 years. Scaled multiple verticals to 7-figures. Looking for technical and product co-founders to explore consumer tech ideas together. Open to brainstorming and finding the right opportunity.',
      skills: ['Growth Marketing', 'SEO', 'Content', 'Paid Acquisition'],
      complement: 78,
      image: '👨‍🎤'
    }
  ];

  const intentIcons = {
    idea: Lightbulb,
    open: Wrench,
    explore: Compass
  };

  const intentLabels = {
    idea: 'Has an idea',
    open: 'Open to ideas',
    explore: 'Wants to explore'
  };

  const intentColors = {
    idea: '#B8941F',
    open: '#0A1F44',
    explore: '#5B6B7A'
  };

  // Filter founders
  const filteredFounders = founders.filter(f => {
    if (filterRole !== 'All' && !f.lookingFor.includes(filterRole) && f.iAm !== filterRole) return false;
    if (filterIntent !== 'All' && f.bringing !== filterIntent.toLowerCase()) return false;
    return true;
  });

  // ============== CONSERVATIVE NAV ==============
  const ConservativeNav = () => (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0A1F44] flex items-center justify-center">
              <span className="text-white text-lg font-serif font-bold tracking-tight">C</span>
            </div>
            <div className="text-left">
              <div className="text-[#0A1F44] font-serif text-xl tracking-tight leading-none">CoFound.th</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1">Est. 2026 · Bangkok</div>
            </div>
          </button>
          <div className="hidden lg:flex items-center gap-10">
            <a className="text-sm text-slate-700 hover:text-[#0A1F44] cursor-pointer tracking-wide">How it works</a>
            <a className="text-sm text-slate-700 hover:text-[#0A1F44] cursor-pointer tracking-wide">For Founders</a>
            <a className="text-sm text-slate-700 hover:text-[#0A1F44] cursor-pointer tracking-wide">Insights</a>
            <a className="text-sm text-slate-700 hover:text-[#0A1F44] cursor-pointer tracking-wide">Community</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage('dashboard')} className="text-sm text-slate-700 hover:text-[#0A1F44] tracking-wide">Sign in</button>
            <button onClick={() => setCurrentPage('dashboard')} className="px-5 py-2.5 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-sm tracking-wide transition-colors">
              Join CoFound.th
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  const ConservativeFooter = () => (
    <footer className="bg-[#0A1F44] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="font-serif text-2xl mb-4">CoFound.th</div>
            <p className="text-sm text-slate-300 leading-relaxed">The platform for Thailand&apos;s founders to find their co-founder.</p>
          </div>
          {[
            { title: 'Platform', items: ['How it works', 'Verification', 'Pricing', 'Roadmap'] },
            { title: 'Resources', items: ['Founder Guides', 'Legal Templates', 'Events', 'Blog'] },
            { title: 'Company', items: ['About', 'Contact', 'Press', 'Careers'] }
          ].map((col, i) => (
            <div key={i}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.items.map((item, j) => <li key={j} className="text-sm text-slate-200 hover:text-white cursor-pointer">{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-400">
          <div>© 2026 CoFound (Thailand) Co., Ltd. All rights reserved.</div>
          <div className="flex gap-6">
            <span>Privacy (PDPA)</span>
            <span>Terms</span>
            <span>Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );

  // ============== LANDING PAGE ==============
  const LandingPage = () => (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <ConservativeNav />

      {/* Hero */}
      <section className="bg-[#FAFAF7] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-8" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <span className="inline-block w-12 h-px bg-slate-400 align-middle mr-3"></span>
                Find the missing piece
              </div>
              <h1 className="font-serif text-5xl lg:text-7xl text-[#0A1F44] leading-[1.05] tracking-tight mb-8">
                The right co-founder is the difference.
              </h1>
              <p className="text-lg text-slate-700 leading-relaxed max-w-2xl mb-10">
                CoFound.th matches Thai entrepreneurs based on complementary skills, intent, and industry — not random swipes. Built for serious founders looking for the right partner to build with.
              </p>
              <div className="flex flex-col sm:flex-row gap-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <button onClick={() => setCurrentPage('dashboard')} className="px-8 py-4 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-sm tracking-wide transition-colors flex items-center justify-center gap-2">
                  Create your profile <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage('matching')} className="px-8 py-4 border border-slate-300 hover:border-[#0A1F44] text-[#0A1F44] text-sm tracking-wide transition-colors">
                  Browse founders
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B8941F]" /> Free to join</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B8941F]" /> Verified profiles</div>
                <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B8941F]" /> Mutual interest required</div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="bg-white border border-slate-200 p-8">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-5" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    Example match
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-[#FAFAF7] border-l-2 border-[#B8941F]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">👩‍💼</div>
                        <div>
                          <div className="font-serif text-lg text-[#0A1F44]">Praewa C.</div>
                          <div className="text-xs text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>Business · FinTech</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-700" style={{ fontFamily: 'system-ui, sans-serif' }}>
                        💡 Has an idea · Needs: Technical Co-founder
                      </div>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F]" style={{ fontFamily: 'system-ui, sans-serif' }}>
                        ◆ Complementary ◆
                      </div>
                    </div>
                    <div className="p-4 bg-[#FAFAF7] border-l-2 border-[#0A1F44]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">👨‍🔬</div>
                        <div>
                          <div className="font-serif text-lg text-[#0A1F44]">Mint T.</div>
                          <div className="text-xs text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>Technical · ML/AI</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-700" style={{ fontFamily: 'system-ui, sans-serif' }}>
                        🔧 Open to ideas · Looking for: Business Co-founder
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-3 -right-3 w-full h-full border border-[#B8941F] -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Profile Types */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-[#B8941F] mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>How it works</div>
            <h2 className="font-serif text-4xl lg:text-5xl text-[#0A1F44] leading-tight">Three kinds of founders. One platform that matches them.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: Lightbulb,
                label: 'I have an idea',
                title: 'Idea-Haver',
                body: 'You have a clear vision and need someone with complementary skills to execute it with you.',
                example: '"Building a FinTech for Thai SMEs. Need a technical co-founder."'
              },
              {
                icon: Wrench,
                label: 'I have skills',
                title: 'Skill-Bringer',
                body: 'You can build, sell, or design — but want to join someone else\'s vision rather than start your own.',
                example: '"Senior engineer. Open to joining a strong commercial founder in HealthTech."'
              },
              {
                icon: Compass,
                label: 'Let\'s figure it out',
                title: 'Explorer',
                body: 'You\'re open to brainstorming and finding the right opportunity together with a partner.',
                example: '"Marketing background. Looking to explore consumer tech ideas with co-founders."'
              }
            ].map((p, i) => (
              <div key={i} className="bg-[#FAFAF7] border border-slate-200 p-8 lg:p-10">
                <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>{p.label}</div>
                <h3 className="font-serif text-2xl text-[#0A1F44] mb-4">{p.title}</h3>
                <p className="text-slate-700 leading-relaxed mb-5">{p.body}</p>
                <div className="pt-5 border-t border-slate-200 italic text-sm text-slate-600">
                  {p.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How matching works */}
      <section className="py-24 bg-[#FAFAF7] border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-3xl mb-20">
            <div className="text-xs uppercase tracking-[0.25em] text-[#B8941F] mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>The process</div>
            <h2 className="font-serif text-4xl lg:text-5xl text-[#0A1F44] leading-tight">Considered. Mutual. Serious.</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { num: 'I', title: 'Create profile', body: 'Declare what you are, what you bring, and what you need.' },
              { num: 'II', title: 'Browse directory', body: 'Filter by role, industry, and intent. Read full pitches.' },
              { num: 'III', title: 'Express interest', body: 'Send a thoughtful note. No spam, no swipes.' },
              { num: 'IV', title: 'Mutual unlock', body: 'When both express interest, messaging opens.' }
            ].map((step, i) => (
              <div key={i}>
                <div className="font-serif text-5xl text-[#B8941F] mb-4 leading-none">{step.num}</div>
                <h3 className="font-serif text-xl text-[#0A1F44] mb-3">{step.title}</h3>
                <p className="text-slate-700 leading-relaxed text-sm">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-[#0A1F44] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
          <Quote className="w-12 h-12 text-[#B8941F] mx-auto mb-8" />
          <blockquote className="font-serif text-3xl lg:text-4xl leading-relaxed mb-10 italic">
            I had the idea, the customers, and the runway. What I didn&apos;t have was a technical co-founder I could trust. CoFound.th matched me with someone whose skills, values, and ambition perfectly complemented mine. Six months later, we&apos;re building together.
          </blockquote>
          <div className="text-sm tracking-wide" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div className="font-semibold">Somchai Tanaka</div>
            <div className="text-slate-300 mt-1">Co-founder, FlexPay Thailand</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="font-serif text-4xl lg:text-5xl text-[#0A1F44] mb-6 leading-tight">Your missing piece is on the platform.</h2>
          <p className="text-lg text-slate-700 mb-10 max-w-2xl mx-auto">
            Join Thailand&apos;s most serious community of founders looking to build together. Free during our launch phase.
          </p>
          <button onClick={() => setCurrentPage('dashboard')} className="px-8 py-4 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-sm tracking-wide transition-colors" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Create your profile — Free
          </button>
        </div>
      </section>

      <ConservativeFooter />
    </div>
  );

  // ============== DASHBOARD ==============
  const DashboardNav = () => (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#0A1F44] flex items-center justify-center">
                <span className="text-white font-serif text-base">C</span>
              </div>
              <span className="text-base font-medium text-[#0A1F44] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>CoFound.th</span>
            </button>
            <nav className="hidden md:flex items-center gap-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'matching', label: 'Browse' },
                { id: 'community', label: 'Community' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`px-4 py-2 text-sm tracking-wide transition-colors ${
                    currentPage === item.id ? 'text-[#0A1F44] border-b-2 border-[#B8941F]' : 'text-slate-600 hover:text-[#0A1F44]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:text-[#0A1F44] relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B8941F] rounded-full"></span>
            </button>
            <button className="p-2 text-slate-500 hover:text-[#0A1F44]">
              <MessageCircle className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-[#0A1F44] flex items-center justify-center text-white text-sm font-medium ml-2">
              S
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const DashboardPage = () => (
    <div className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Georgia, serif' }}>
      <DashboardNav />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {/* Welcome */}
        <div className="mb-10 pb-8 border-b border-slate-200">
          <div className="text-xs uppercase tracking-[0.25em] text-[#B8941F] mb-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Member dashboard
          </div>
          <h1 className="font-serif text-4xl text-[#0A1F44] mb-2">Welcome back, Somchai.</h1>
          <p className="text-slate-600">You have 3 new expressions of interest and 8 founders matching your criteria this week.</p>
        </div>

        {/* Your profile summary */}
        <div className="bg-white border border-slate-200 p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>Your profile</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-[#0A1F44] text-white flex items-center justify-center text-lg font-serif">S</div>
                <div>
                  <div className="font-serif text-xl text-[#0A1F44]">Somchai Tanaka</div>
                  <div className="text-xs text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>Business · FinTech</div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">I am</div>
                <div className="text-sm text-[#0A1F44] font-medium">Business Founder</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">I'm bringing</div>
                <div className="text-sm text-[#0A1F44] font-medium">A specific idea</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">Looking for</div>
                <div className="text-sm text-[#0A1F44] font-medium">Technical Co-founder</div>
              </div>
              <div className="col-span-3 pt-4 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">Profile completeness</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#B8941F] w-[85%]"></div>
                  </div>
                  <span className="text-sm font-medium text-[#0A1F44]">85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Profile views', value: '142', icon: Eye },
            { label: 'Interest received', value: '7', icon: Send },
            { label: 'Interest sent', value: '4', icon: ArrowUpRight },
            { label: 'Active conversations', value: '2', icon: MessageCircle }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6">
              <stat.icon className="w-4 h-4 text-[#B8941F] mb-3" />
              <div className="font-serif text-3xl text-[#0A1F44]">{stat.value}</div>
              <div className="text-xs uppercase tracking-[0.15em] text-slate-500 mt-1" style={{ fontFamily: 'system-ui, sans-serif' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* This week's matches */}
          <div className="lg:col-span-2 bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F]" style={{ fontFamily: 'system-ui, sans-serif' }}>Curated for you</div>
                <h2 className="font-serif text-2xl text-[#0A1F44] mt-1">This week&apos;s matches</h2>
              </div>
              <button onClick={() => setCurrentPage('matching')} className="text-sm text-[#0A1F44] hover:text-[#B8941F] flex items-center gap-1 tracking-wide" style={{ fontFamily: 'system-ui, sans-serif' }}>
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {founders.slice(0, 3).map((f) => {
                const Icon = intentIcons[f.bringing];
                return (
                  <div key={f.id} className="p-6 hover:bg-[#FAFAF7] transition-colors cursor-pointer" onClick={() => { setSelectedProfile(f); setCurrentPage('profile'); }}>
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-[#FAFAF7] border border-slate-200 flex items-center justify-center text-3xl flex-shrink-0">
                        {f.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-serif text-xl text-[#0A1F44]">{f.name}</h3>
                          <BadgeCheck className="w-4 h-4 text-[#B8941F]" />
                        </div>
                        <div className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
                          {f.iAm} · {f.industry} · {f.location}
                        </div>
                        <div className="flex items-center gap-4 mb-3 text-xs" style={{ fontFamily: 'system-ui, sans-serif' }}>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Icon className="w-3.5 h-3.5" style={{ color: intentColors[f.bringing] }} />
                            {intentLabels[f.bringing]}
                          </div>
                          <div className="text-slate-500">
                            Needs: {f.lookingFor.join(', ')}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed line-clamp-2" style={{ fontFamily: 'Georgia, serif' }}>{f.pitch}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="font-serif text-2xl text-[#0A1F44]">{f.complement}<span className="text-base">%</span></div>
                          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400" style={{ fontFamily: 'system-ui, sans-serif' }}>Complement</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Interest received */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>Awaiting your review</div>
              <h3 className="font-serif text-xl text-[#0A1F44] mb-4">Recent interest</h3>
              <div className="space-y-3">
                {[
                  { name: 'Praewa Chai', role: 'Business · E-commerce', time: '2h ago' },
                  { name: 'Niran Suksawat', role: 'Technical · FinTech', time: '5h ago' },
                  { name: 'Mint Tantirat', role: 'Technical · AI', time: '1d ago' }
                ].map((person, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0A1F44] truncate">{person.name}</div>
                      <div className="text-xs text-slate-500 truncate">{person.role}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">{person.time}</div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2.5 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-xs tracking-wide" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Review all
              </button>
            </div>

            {/* Founding member badge */}
            <div className="bg-[#0A1F44] text-white p-6">
              <Award className="w-6 h-6 text-[#B8941F] mb-3" />
              <h3 className="font-serif text-lg mb-2">Founding Member</h3>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                You joined CoFound.th in our launch phase. You&apos;ll always have free lifetime access to premium features when we launch them.
              </p>
            </div>

            {/* Events */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>Coming up</div>
              <h3 className="font-serif text-xl text-[#0A1F44] mb-4">Events</h3>
              <div className="space-y-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <div className="border-l-2 border-[#B8941F] pl-3">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">Tomorrow · 7PM</div>
                  <div className="text-sm font-medium text-[#0A1F44]">Bangkok Founders Mixer</div>
                  <div className="text-xs text-slate-500 mt-0.5">Glowfish, Sathorn</div>
                </div>
                <div className="border-l-2 border-slate-300 pl-3">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">Friday · 2PM</div>
                  <div className="text-sm font-medium text-[#0A1F44]">Choosing a Co-Founder Workshop</div>
                  <div className="text-xs text-slate-500 mt-0.5">Online webinar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ============== BROWSE / MATCHING PAGE ==============
  const MatchingPage = () => (
    <div className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Georgia, serif' }}>
      <DashboardNav />

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="text-xs uppercase tracking-[0.25em] text-[#B8941F] mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Founder Directory
          </div>
          <h1 className="font-serif text-4xl text-[#0A1F44] mb-2">Browse Founders</h1>
          <p className="text-slate-700">Verified Thai founders looking to build together. Filter by what you need.</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filter sidebar */}
          <aside className="lg:col-span-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div className="bg-white border border-slate-200 p-6 sticky top-6">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-5">Refine</div>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Looking for role</div>
                <div className="space-y-1.5">
                  {['All', 'Technical', 'Business', 'Product', 'Marketing', 'Finance'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setFilterRole(role)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        filterRole === role ? 'bg-[#0A1F44] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 pt-6 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Founder intent</div>
                <div className="space-y-1.5">
                  {[
                    { val: 'All', label: 'All intents' },
                    { val: 'idea', label: '💡 Has an idea' },
                    { val: 'open', label: '🔧 Open to ideas' },
                    { val: 'explore', label: '🧭 Wants to explore' }
                  ].map((intent) => (
                    <button
                      key={intent.val}
                      onClick={() => setFilterIntent(intent.val)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        filterIntent === intent.val ? 'bg-[#0A1F44] text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {intent.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 pt-6 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Industry</div>
                <select className="w-full px-3 py-2 bg-white border border-slate-300 text-sm focus:outline-none focus:border-[#0A1F44]">
                  <option>All industries</option>
                  <option>FinTech</option>
                  <option>HealthTech</option>
                  <option>E-commerce</option>
                  <option>SaaS</option>
                  <option>AI / ML</option>
                  <option>PropTech</option>
                </select>
              </div>

              <div className="mb-6 pt-6 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Stage</div>
                <div className="space-y-1.5">
                  {['Just exploring', 'Building MVP', 'Have traction', 'Raising'].map((stage) => (
                    <label key={stage} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" className="accent-[#0A1F44]" /> {stage}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6 pt-6 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Commitment</div>
                <div className="space-y-1.5">
                  {['Full-time', 'Part-time', 'Side project'].map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" className="accent-[#0A1F44]" /> {c}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <div className="text-sm text-slate-600">
                Showing <span className="font-medium text-[#0A1F44]">{filteredFounders.length}</span> founders
              </div>
              <select className="px-3 py-1.5 bg-white border border-slate-300 text-sm">
                <option>Sort by: Complement score</option>
                <option>Sort by: Recently active</option>
                <option>Sort by: Newest</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredFounders.map((f) => {
                const Icon = intentIcons[f.bringing];
                return (
                  <div
                    key={f.id}
                    onClick={() => { setSelectedProfile(f); setCurrentPage('profile'); }}
                    className="bg-white border border-slate-200 hover:border-[#0A1F44] transition-colors cursor-pointer p-7"
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-20 h-20 bg-[#FAFAF7] border border-slate-200 flex items-center justify-center text-4xl flex-shrink-0">
                        {f.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-xl text-[#0A1F44]">{f.name}, {f.age}</h3>
                            <BadgeCheck className="w-4 h-4 text-[#B8941F]" />
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-serif text-2xl text-[#0A1F44]">{f.complement}<span className="text-sm">%</span></div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400" style={{ fontFamily: 'system-ui, sans-serif' }}>Complement</div>
                          </div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
                          {f.iAm} · {f.industry} · {f.location} · {f.commitment}
                        </div>

                        <div className="flex flex-wrap gap-4 mb-4 text-xs" style={{ fontFamily: 'system-ui, sans-serif' }}>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Icon className="w-3.5 h-3.5" style={{ color: intentColors[f.bringing] }} />
                            <span className="font-medium">{intentLabels[f.bringing]}</span>
                          </div>
                          <div className="text-slate-500">
                            <span className="text-slate-400">Looking for:</span> {f.lookingFor.join(' or ')} Co-founder
                          </div>
                          <div className="text-slate-500">
                            <span className="text-slate-400">Stage:</span> {f.stage}
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed line-clamp-2 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                          {f.pitch}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1.5">
                            {f.skills.slice(0, 4).map((skill, j) => (
                              <span key={j} className="px-2.5 py-1 bg-[#FAFAF7] border border-slate-200 text-xs text-slate-700" style={{ fontFamily: 'system-ui, sans-serif' }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-[#0A1F44] hover:text-[#B8941F] flex items-center gap-1 flex-shrink-0" style={{ fontFamily: 'system-ui, sans-serif' }}>
                            View full profile <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ============== PROFILE PAGE ==============
  const ProfilePage = () => {
    const f = selectedProfile;
    if (!f) return null;
    const Icon = intentIcons[f.bringing];

    return (
      <div className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Georgia, serif' }}>
        <DashboardNav />
        <main className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
          {/* Back */}
          <button onClick={() => setCurrentPage('matching')} className="text-sm text-slate-600 hover:text-[#0A1F44] mb-6 flex items-center gap-1.5" style={{ fontFamily: 'system-ui, sans-serif' }}>
            ← Back to directory
          </button>

          {/* Header */}
          <div className="bg-white border border-slate-200 p-10 mb-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="w-32 h-32 bg-[#FAFAF7] border border-slate-200 flex items-center justify-center text-7xl mb-5">
                  {f.image}
                </div>
                <div className="flex items-center gap-2 text-sm text-[#B8941F] mb-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <BadgeCheck className="w-4 h-4" /> Verified founder
                </div>
              </div>
              <div className="md:col-span-2">
                <h1 className="font-serif text-4xl text-[#0A1F44] mb-2">{f.name}</h1>
                <div className="text-sm text-slate-500 uppercase tracking-[0.15em] mb-6" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  {f.iAm} Founder · {f.industry} · {f.location}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">I am</div>
                    <div className="text-sm text-[#0A1F44] font-medium">{f.iAm}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">I'm bringing</div>
                    <div className="text-sm text-[#0A1F44] font-medium flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: intentColors[f.bringing] }} />
                      {intentLabels[f.bringing]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">Looking for</div>
                    <div className="text-sm text-[#0A1F44] font-medium">{f.lookingFor.join(' / ')}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1" style={{ fontFamily: 'system-ui, sans-serif' }}>Complement score</div>
                    <div className="font-serif text-4xl text-[#0A1F44]">{f.complement}%</div>
                  </div>
                  <button className="px-6 py-3 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-sm tracking-wide transition-colors flex items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    Express Interest <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pitch */}
          <div className="bg-white border border-slate-200 p-10 mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>The pitch</div>
            <p className="font-serif text-xl text-slate-800 leading-relaxed italic">
              &ldquo;{f.pitch}&rdquo;
            </p>
          </div>

          {/* Details grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-slate-200 p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-5" style={{ fontFamily: 'system-ui, sans-serif' }}>Skills & expertise</div>
              <div className="flex flex-wrap gap-2">
                {f.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 text-sm text-slate-700" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-8">
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-5" style={{ fontFamily: 'system-ui, sans-serif' }}>Conviction signals</div>
              <div className="space-y-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
                {[
                  ['Commitment', f.commitment],
                  ['Financial runway', f.runway],
                  ['Founder experience', f.experience],
                  ['Current stage', f.stage]
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-[#0A1F44] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Why this is a match */}
          <div className="bg-[#0A1F44] text-white p-10 mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F] mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>Why we think this is a strong match</div>
            <ul className="space-y-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-[#B8941F] flex-shrink-0 mt-0.5" />
                You&apos;re looking for a {f.iAm.toLowerCase()} co-founder, and {f.name.split(' ')[0]} is a {f.iAm.toLowerCase()} founder
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-[#B8941F] flex-shrink-0 mt-0.5" />
                Both of you are focused on {f.industry}
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-[#B8941F] flex-shrink-0 mt-0.5" />
                {f.name.split(' ')[0]}&apos;s intent aligns with what you bring to the table
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-[#B8941F] flex-shrink-0 mt-0.5" />
                Both committed full-time with similar financial runway
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="bg-white border border-slate-200 p-10 text-center">
            <h3 className="font-serif text-2xl text-[#0A1F44] mb-3">Interested in {f.name.split(' ')[0]}?</h3>
            <p className="text-slate-700 mb-6 max-w-xl mx-auto">Send a personal note explaining why you think you&apos;d work well together. {f.name.split(' ')[0]} will see your full profile when they receive it.</p>
            <button className="px-8 py-3.5 bg-[#0A1F44] hover:bg-[#0F2654] text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
              Express Interest <Send className="w-4 h-4" />
            </button>
            <div className="mt-4 text-xs text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>Messaging unlocks when interest is mutual</div>
          </div>
        </main>
      </div>
    );
  };

  // ============== COMMUNITY ==============
  const CommunityPage = () => (
    <div className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: 'Georgia, serif' }}>
      <DashboardNav />

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="text-xs uppercase tracking-[0.25em] text-[#B8941F] mb-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Community
          </div>
          <h1 className="font-serif text-4xl text-[#0A1F44] mb-2">Founder Community</h1>
          <p className="text-slate-700">Connect, learn, and grow with Thailand&apos;s serious founders.</p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
        {/* Resource cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {[
            { icon: Calendar, title: 'Events', desc: 'Founder mixers and workshops', count: '8 upcoming' },
            { icon: FileText, title: 'Legal Templates', desc: 'Co-founder agreements, NDAs, term sheets', count: '24 templates' },
            { icon: BookOpen, title: 'Founder Guides', desc: 'How to choose, evaluate, and onboard co-founders', count: '18 articles' }
          ].map((card, i) => (
            <div key={i} className="bg-white border border-slate-200 hover:border-[#0A1F44] transition-colors p-7 cursor-pointer">
              <card.icon className="w-5 h-5 text-[#B8941F] mb-4" />
              <h3 className="font-serif text-xl text-[#0A1F44] mb-2">{card.title}</h3>
              <p className="text-sm text-slate-700 mb-3" style={{ fontFamily: 'Georgia, serif' }}>{card.desc}</p>
              <div className="text-xs uppercase tracking-[0.15em] text-[#B8941F] flex items-center gap-1" style={{ fontFamily: 'system-ui, sans-serif' }}>
                Explore <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Forum */}
        <div className="bg-white border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#B8941F]" style={{ fontFamily: 'system-ui, sans-serif' }}>Discussions</div>
              <h2 className="font-serif text-2xl text-[#0A1F44] mt-1">Recent threads</h2>
            </div>
            <button className="px-4 py-2 border border-[#0A1F44] hover:bg-[#0A1F44] hover:text-white text-[#0A1F44] text-xs tracking-wide transition-colors" style={{ fontFamily: 'system-ui, sans-serif' }}>
              + New post
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { author: 'Ploy K.', avatar: '👩', title: 'How did you split equity with your co-founder?', tag: 'Co-founders', replies: 23, time: '2h' },
              { author: 'Tee S.', avatar: '🧑', title: 'How long should a co-founder trial period be?', tag: 'Partnerships', replies: 18, time: '5h' },
              { author: 'Mint W.', avatar: '👩‍💼', title: 'Red flags I missed with my first co-founder', tag: 'Lessons', replies: 41, time: '1d' },
              { author: 'Boom L.', avatar: '👨‍💻', title: 'Tips for evaluating technical co-founders without being technical?', tag: 'Hiring', replies: 12, time: '1d' }
            ].map((post, i) => (
              <div key={i} className="p-6 hover:bg-[#FAFAF7] cursor-pointer transition-colors flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FAFAF7] border border-slate-200 flex items-center justify-center text-xl flex-shrink-0">{post.avatar}</div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg text-[#0A1F44] hover:text-[#B8941F]">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500" style={{ fontFamily: 'system-ui, sans-serif' }}>
                    <span>by {post.author}</span>
                    <span className="px-2 py-0.5 bg-[#FAFAF7] border border-slate-200 text-slate-700">{post.tag}</span>
                    <span>· {post.time}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-1 flex-shrink-0" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <MessageCircle className="w-4 h-4" /> {post.replies}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );

  const renderPage = () => {
    switch(currentPage) {
      case 'landing': return <LandingPage />;
      case 'dashboard': return <DashboardPage />;
      case 'matching': return <MatchingPage />;
      case 'profile': return <ProfilePage />;
      case 'community': return <CommunityPage />;
      default: return <LandingPage />;
    }
  };

  return (
    <div>
      {/* Demo navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#0A1F44] text-white shadow-2xl px-2 py-2 flex items-center gap-1 text-xs" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <span className="px-3 text-slate-400 font-medium">Demo:</span>
        {[
          { id: 'landing', label: 'Landing' },
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'matching', label: 'Browse' },
          { id: 'profile', label: 'Profile' },
          { id: 'community', label: 'Community' }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => {
              if (p.id === 'profile' && !selectedProfile) setSelectedProfile(founders[0]);
              setCurrentPage(p.id);
            }}
            className={`px-3 py-1.5 font-medium transition-colors ${
              currentPage === p.id ? 'bg-[#B8941F] text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* Phase 1 indicator */}
      <div className="fixed top-4 right-4 z-50 bg-white border border-slate-200 px-3 py-1.5 text-xs shadow-sm flex items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <span className="w-2 h-2 bg-[#B8941F] rounded-full"></span>
        <span className="text-slate-700 font-medium">Phase 1 · Co-Founder Matching</span>
      </div>
      {renderPage()}
    </div>
  );
}
