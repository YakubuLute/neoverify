import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../shared';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  actionText: string;
}

interface Statistic {
  value: string;
  label: string;
  icon: string;
  trend: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
  industry: string;
}

interface ActionCard {
  title: string;
  description: string;
  icon: string;
  buttonText: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-slate-50">
      <!-- Navigation Header -->
      <nav class="bg-white/98 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-18">
            <!-- Logo -->
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <i class="pi pi-shield text-white text-xl"></i>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-black tracking-tight text-slate-900">
                  NeoVerify
                </span>
                <span class="text-xs font-medium text-slate-500 -mt-1">Anti-Counterfeit Platform</span>
              </div>
            </div>

            <!-- Navigation Links -->
            <div class="hidden lg:flex items-center space-x-10">
              <a href="#features" class="text-slate-700 hover:text-blue-600 font-semibold text-sm tracking-wide transition-all duration-200 hover:scale-105">FEATURES</a>
              <a href="#solutions" class="text-slate-700 hover:text-blue-600 font-semibold text-sm tracking-wide transition-all duration-200 hover:scale-105">SOLUTIONS</a>
              <a href="#testimonials" class="text-slate-700 hover:text-blue-600 font-semibold text-sm tracking-wide transition-all duration-200 hover:scale-105">SUCCESS STORIES</a>
              <a href="#pricing" class="text-slate-700 hover:text-blue-600 font-semibold text-sm tracking-wide transition-all duration-200 hover:scale-105">PRICING</a>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-4">
              <button 
                (click)="navigate('/auth/login')"
                class="text-slate-700 hover:text-blue-600 font-semibold text-sm tracking-wide transition-all duration-200"
              >
                SIGN IN
              </button>
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl border border-blue-500"
              >
                START FREE TRIAL
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-20 pb-32">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-5">
          <div class="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div class="absolute top-40 right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div class="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <!-- Hero Badge -->
            <div class="inline-flex items-center px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full border border-blue-200 mb-10 shadow-sm">
              <div class="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <span class="text-sm font-bold text-slate-700 tracking-wide">LIVE: 50,000+ DOCUMENTS VERIFIED TODAY</span>
            </div>

            <!-- Hero Title -->
            <h1 class="text-6xl md:text-8xl font-black text-slate-900 mb-8 leading-none tracking-tight">
              ELIMINATE
              <br>
              <span class="bg-gradient-to-r from-red-600 via-orange-500 to-red-700 bg-clip-text text-transparent">
                COUNTERFEITS
              </span>
              <br>
              <span class="text-5xl md:text-6xl text-slate-700">FOREVER</span>
            </h1>

            <!-- Hero Subtitle -->
            <p class="text-2xl md:text-3xl text-slate-600 mb-12 max-w-5xl mx-auto leading-relaxed font-medium">
              Deploy military-grade AI forensics and blockchain verification to 
              <span class="text-blue-600 font-bold">instantly detect counterfeits</span>, 
              protect your revenue, and safeguard customer trust.
            </p>

            <!-- Urgency Indicator -->
            <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-12 max-w-4xl mx-auto">
              <div class="flex items-center justify-center mb-4">
                <i class="pi pi-exclamation-triangle text-red-500 text-2xl mr-3"></i>
                <span class="text-lg font-bold text-red-700">COUNTERFEIT CRISIS ALERT</span>
              </div>
              <p class="text-red-600 font-semibold text-lg">
                $4.2 TRILLION lost annually to counterfeiting worldwide. 
                <span class="text-red-800 font-black">Your brand could be next.</span>
              </p>
            </div>

            <!-- Hero CTA -->
            <div class="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-800 text-white px-12 py-5 rounded-2xl font-black text-xl tracking-wide transition-all duration-200 transform hover:scale-105 shadow-2xl hover:shadow-3xl border border-blue-500 flex items-center"
              >
                <i class="pi pi-shield mr-4 text-2xl"></i>
                PROTECT MY BRAND NOW
              </button>
              <button 
                (click)="navigate('/documents/verify')"
                class="bg-white hover:bg-slate-50 text-slate-800 px-12 py-5 rounded-2xl font-bold text-xl border-3 border-slate-300 hover:border-blue-400 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
              >
                <i class="pi pi-search mr-4 text-2xl text-blue-600"></i>
                VERIFY DOCUMENT FREE
              </button>
            </div>

            <!-- Trust Indicators -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              @for (stat of statistics; track stat.label) {
                <div class="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                    <i [class]="stat.icon + ' text-white text-2xl'"></i>
                  </div>
                  <div class="text-4xl font-black text-slate-900 mb-2">{{ stat.value }}</div>
                  <div class="text-sm font-bold text-slate-600 tracking-wide uppercase">{{ stat.label }}</div>
                  <div class="text-xs text-green-600 font-semibold mt-1">{{ stat.trend }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-32 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-24">
            <div class="inline-block bg-blue-100 text-blue-800 px-6 py-2 rounded-full font-bold text-sm tracking-wide mb-6">
              ENTERPRISE-GRADE PROTECTION
            </div>
            <h2 class="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight">
              WEAPONS-GRADE
              <br>
              <span class="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                ANTI-COUNTERFEIT
              </span>
              <br>
              TECHNOLOGY
            </h2>
            <p class="text-2xl text-slate-600 max-w-4xl mx-auto font-medium leading-relaxed">
              Deploy the same technology used by Fortune 500 companies and government agencies 
              to eliminate counterfeits and protect billions in revenue.
            </p>
          </div>

          <!-- Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (feature of features; track feature.title) {
              <div class="group bg-gradient-to-br from-white to-slate-50 p-10 rounded-3xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105">
                <div [class]="'inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8 shadow-lg ' + feature.color">
                  <i [class]="feature.icon + ' text-3xl text-white'"></i>
                </div>
                <h3 class="text-2xl font-black text-slate-900 mb-6 tracking-tight">{{ feature.title }}</h3>
                <p class="text-slate-600 leading-relaxed text-lg mb-8 font-medium">{{ feature.description }}</p>
                <button class="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 transform hover:scale-105 shadow-lg">
                  {{ feature.actionText }}
                </button>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Solutions Section -->
      <section id="solutions" class="py-32 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-24">
            <div class="inline-block bg-blue-500/20 text-blue-300 px-6 py-2 rounded-full font-bold text-sm tracking-wide mb-6 border border-blue-400/30">
              IMMEDIATE ACTION REQUIRED
            </div>
            <h2 class="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
              STOP LOSING
              <br>
              <span class="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                MILLIONS
              </span>
              <br>
              TO COUNTERFEITS
            </h2>
            <p class="text-2xl text-slate-300 max-w-4xl mx-auto font-medium leading-relaxed">
              Every day you wait, counterfeiters steal more of your revenue, damage your reputation, 
              and put your customers at risk. Take action now.
            </p>
          </div>

          <!-- Action Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (actionCard of actionCards; track actionCard.title) {
              <div [class]="'group p-10 rounded-3xl border-2 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105 ' + actionCard.color">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-8 shadow-lg">
                  <i [class]="actionCard.icon + ' text-3xl text-white'"></i>
                </div>
                <h3 class="text-2xl font-black text-white mb-6 tracking-tight">{{ actionCard.title }}</h3>
                <p class="text-slate-300 leading-relaxed text-lg mb-8 font-medium">{{ actionCard.description }}</p>
                <button 
                  (click)="navigate(actionCard.route)"
                  class="bg-white hover:bg-slate-100 text-slate-900 px-8 py-4 rounded-xl font-black text-sm tracking-wide transition-all duration-200 transform hover:scale-105 shadow-lg w-full"
                >
                  {{ actionCard.buttonText }}
                </button>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section id="how-it-works" class="py-32 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-24">
            <div class="inline-block bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold text-sm tracking-wide mb-6">
              DEPLOYMENT IN 60 SECONDS
            </div>
            <h2 class="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
              THREE STEPS TO
              <br>
              <span class="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                TOTAL PROTECTION
              </span>
            </h2>
            <p class="text-2xl text-slate-600 max-w-4xl mx-auto font-medium leading-relaxed">
              Deploy enterprise-grade anti-counterfeit protection in under one minute. 
              No technical expertise required.
            </p>
          </div>

          <!-- Process Steps -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            <!-- Step 1 -->
            <div class="text-center group">
              <div class="relative mb-10">
                <div class="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-upload text-white text-4xl"></i>
                </div>
                <div class="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-lg font-black text-slate-900">1</span>
                </div>
              </div>
              <h3 class="text-3xl font-black text-slate-900 mb-6">UPLOAD & SECURE</h3>
              <p class="text-slate-600 leading-relaxed text-lg font-medium">
                Upload your documents instantly. Our AI immediately creates an unbreakable digital fingerprint 
                and stores it on the blockchain.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="text-center group">
              <div class="relative mb-10">
                <div class="w-32 h-32 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-eye text-white text-4xl"></i>
                </div>
                <div class="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-lg font-black text-slate-900">2</span>
                </div>
              </div>
              <h3 class="text-3xl font-black text-slate-900 mb-6">AI FORENSICS</h3>
              <p class="text-slate-600 leading-relaxed text-lg font-medium">
                Military-grade AI analyzes every pixel for tampering, forgery, and authenticity markers 
                with 99.9% accuracy in under 3 seconds.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="text-center group">
              <div class="relative mb-10">
                <div class="w-32 h-32 bg-gradient-to-br from-purple-600 to-pink-700 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-verified text-white text-4xl"></i>
                </div>
                <div class="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-lg font-black text-slate-900">3</span>
                </div>
              </div>
              <h3 class="text-3xl font-black text-slate-900 mb-6">INSTANT PROOF</h3>
              <p class="text-slate-600 leading-relaxed text-lg font-medium">
                Get tamper-proof verification certificates with QR codes. Share with customers, 
                partners, and regulators instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section id="testimonials" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-20">
            <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Industry Leaders
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our customers say about protecting their brands with NeoVerify
            </p>
          </div>

          <!-- Testimonials Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @for (testimonial of testimonials; track testimonial.name) {
              <div class="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-2xl border border-purple-100">
                <div class="flex items-center mb-6">
                  <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
                    <span class="text-white font-bold text-lg">{{ testimonial.avatar }}</span>
                  </div>
                  <div>
                    <div class="font-bold text-gray-900">{{ testimonial.name }}</div>
                    <div class="text-sm text-gray-600">{{ testimonial.role }}, {{ testimonial.company }}</div>
                  </div>
                </div>
                <p class="text-gray-700 leading-relaxed italic">
                  "{{ testimonial.content }}"
                </p>
                <div class="flex text-yellow-400 mt-4">
                  <i class="pi pi-star-fill"></i>
                  <i class="pi pi-star-fill"></i>
                  <i class="pi pi-star-fill"></i>
                  <i class="pi pi-star-fill"></i>
                  <i class="pi pi-star-fill"></i>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-24 bg-gradient-to-r from-purple-600 to-blue-600">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Protect Your Brand?
          </h2>
          <p class="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
            Join thousands of organizations already using NeoVerify to combat counterfeiting and build customer trust.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              (click)="navigate('/auth/signup')"
              class="bg-white hover:bg-gray-100 text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-xl flex items-center"
            >
              <i class="pi pi-shield mr-3"></i>
              Start Free Trial
            </button>
            <button 
              (click)="navigate('/documents/verify')"
              class="bg-transparent hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-white/30 hover:border-white transition-all duration-200 flex items-center"
            >
              <i class="pi pi-search mr-3"></i>
              Verify Document Now
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-gray-900 text-white py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
            <!-- Company Info -->
            <div class="col-span-1 md:col-span-2">
              <div class="flex items-center space-x-3 mb-6">
                <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <i class="pi pi-shield text-white text-lg"></i>
                </div>
                <span class="text-2xl font-bold">NeoVerify</span>
              </div>
              <p class="text-gray-400 mb-6 max-w-md">
                Leading the fight against counterfeiting with advanced AI and blockchain technology. 
                Protecting brands and building trust worldwide.
              </p>
              <div class="flex space-x-4">
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-twitter text-sm"></i>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-linkedin text-sm"></i>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-purple-600 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-github text-sm"></i>
                </a>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h3 class="font-bold text-lg mb-4">Product</h3>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#features" class="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" class="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" class="hover:text-white transition-colors">API</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>

            <!-- Support -->
            <div>
              <h3 class="font-bold text-lg mb-4">Support</h3>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#" class="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div class="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NeoVerify. All rights reserved. Protecting authenticity worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    
    html {
      scroll-behavior: smooth;
    }
  `]
})
export class LandingComponent {
  readonly features: Feature[] = [
    {
      icon: 'pi pi-eye',
      title: 'AI Forensics Detection',
      description: 'Advanced machine learning algorithms detect document tampering, alterations, and forgeries with 99.9% accuracy.',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500'
    },
    {
      icon: 'pi pi-lock',
      title: 'Blockchain Security',
      description: 'Immutable verification records stored on blockchain ensure tamper-proof authenticity certificates.',
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500'
    },
    {
      icon: 'pi pi-bolt',
      title: 'Instant Verification',
      description: 'Get verification results in under 3 seconds with real-time processing and immediate feedback.',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
    },
    {
      icon: 'pi pi-qrcode',
      title: 'QR Code Integration',
      description: 'Generate secure QR codes for easy document sharing and verification by customers and partners.',
      color: 'bg-gradient-to-r from-green-500 to-teal-500'
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights into verification patterns, fraud attempts, and document authenticity trends.',
      color: 'bg-gradient-to-r from-indigo-500 to-purple-500'
    },
    {
      icon: 'pi pi-mobile',
      title: 'Mobile-First Design',
      description: 'Seamless experience across all devices with responsive design and native mobile app support.',
      color: 'bg-gradient-to-r from-red-500 to-pink-500'
    }
  ];

  readonly statistics: Statistic[] = [
    { value: '99.9%', label: 'Accuracy Rate', icon: 'pi pi-check-circle' },
    { value: '10K+', label: 'Organizations', icon: 'pi pi-building' },
    { value: '1M+', label: 'Documents Verified', icon: 'pi pi-file' },
    { value: '<3s', label: 'Verification Time', icon: 'pi pi-clock' }
  ];

  readonly testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Chief Security Officer',
      company: 'TechCorp Industries',
      content: 'NeoVerify has revolutionized how we handle document verification. The AI detection caught forgeries our previous system missed entirely.',
      avatar: 'SC'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Compliance Director',
      company: 'Global Finance Ltd',
      content: 'The blockchain integration gives us complete confidence in our verification process. Our audit compliance improved dramatically.',
      avatar: 'MR'
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Academic Registrar',
      company: 'University of Excellence',
      content: 'Protecting our academic credentials has never been easier. Students and employers trust our verified documents completely.',
      avatar: 'EW'
    }
  ];

  constructor(private router: Router) { }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  scrollToDemo(): void {
    // Scroll to how-it-works section
    document.getElementById('how-it-works')?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}