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
    <div class="min-h-screen bg-gray-900">
      <!-- Navigation Header -->
      <nav class="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Logo -->
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <i class="pi pi-shield text-gray-900 text-lg"></i>
              </div>
              <span class="text-xl font-semibold text-white">
                NeoVerify
              </span>
            </div>

            <!-- Navigation Links -->
            <div class="hidden lg:flex items-center space-x-8">
              <a href="#features" class="text-gray-300 hover:text-cyan-400 font-normal text-sm transition-colors">Features</a>
              <a href="#solutions" class="text-gray-300 hover:text-cyan-400 font-normal text-sm transition-colors">Solutions</a>
              <a href="#testimonials" class="text-gray-300 hover:text-cyan-400 font-normal text-sm transition-colors">Testimonials</a>
              <a href="#pricing" class="text-gray-300 hover:text-cyan-400 font-normal text-sm transition-colors">Pricing</a>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-4">
              <button 
                (click)="navigate('/auth/login')"
                class="text-gray-300 hover:text-cyan-400 font-normal text-sm transition-colors"
              >
                Sign In
              </button>
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gray-900 pt-20 pb-24">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-20 left-10 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div class="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <!-- Hero Badge -->
            <div class="inline-flex items-center px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-cyan-500/30 mb-8">
              <div class="w-2 h-2 bg-cyan-400 rounded-full mr-3 animate-pulse"></div>
              <span class="text-sm font-normal text-cyan-400">Live: 50,000+ documents verified today</span>
            </div>

            <!-- Hero Title - Only large fonts here -->
            <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Stop Counterfeits
              <br>
              <span class="text-cyan-400">
                Protect Your Brand
              </span>
            </h1>

            <!-- Hero Subtitle -->
            <p class="text-xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-normal">
              Advanced AI-powered document verification and blockchain technology to combat counterfeiting. 
              Verify authenticity in seconds and build unshakeable customer trust.
            </p>

            <!-- Hero CTA -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 flex items-center"
              >
                <i class="pi pi-shield mr-3"></i>
                Start Protecting Now
              </button>
              <button 
                (click)="navigate('/documents/verify')"
                class="bg-transparent hover:bg-gray-800 text-white px-8 py-4 rounded-lg font-normal text-lg border border-gray-700 hover:border-cyan-500 transition-all duration-200 flex items-center"
              >
                <i class="pi pi-search mr-3"></i>
                Verify Document Free
              </button>
            </div>

            <!-- Trust Indicators -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              @for (stat of statistics; track stat.label) {
                <div class="text-center bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                  <div class="inline-flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-lg mb-4">
                    <i [class]="stat.icon + ' text-cyan-400 text-xl'"></i>
                  </div>
                  <div class="text-2xl font-semibold text-white mb-1">{{ stat.value }}</div>
                  <div class="text-sm font-normal text-gray-400">{{ stat.label }}</div>
                  <div class="text-xs text-cyan-400 font-normal mt-1">{{ stat.trend }}</div>
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
      <section id="testimonials" class="py-32 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-24">
            <div class="inline-block bg-green-100 text-green-800 px-6 py-2 rounded-full font-bold text-sm tracking-wide mb-6">
              SUCCESS STORIES
            </div>
            <h2 class="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
              REAL RESULTS FROM
              <br>
              <span class="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                REAL COMPANIES
              </span>
            </h2>
            <p class="text-2xl text-slate-600 max-w-4xl mx-auto font-medium leading-relaxed">
              See how industry leaders eliminated counterfeits, protected revenue, 
              and restored customer trust with NeoVerify.
            </p>
          </div>

          <!-- Testimonials Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @for (testimonial of testimonials; track testimonial.name) {
              <div class="bg-gradient-to-br from-slate-50 to-blue-50 p-10 rounded-3xl border-2 border-slate-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div class="flex items-center mb-8">
                  <div class="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <span class="text-white font-black text-xl">{{ testimonial.avatar }}</span>
                  </div>
                  <div>
                    <div class="font-black text-slate-900 text-lg">{{ testimonial.name }}</div>
                    <div class="text-sm font-bold text-slate-600">{{ testimonial.role }}</div>
                    <div class="text-sm text-blue-600 font-semibold">{{ testimonial.company }}</div>
                    <div class="text-xs text-slate-500 font-medium">{{ testimonial.industry }}</div>
                  </div>
                </div>
                <p class="text-slate-700 leading-relaxed text-lg font-medium mb-6">
                  "{{ testimonial.content }}"
                </p>
                <div class="flex text-yellow-500 mb-4">
                  <i class="pi pi-star-fill text-lg"></i>
                  <i class="pi pi-star-fill text-lg"></i>
                  <i class="pi pi-star-fill text-lg"></i>
                  <i class="pi pi-star-fill text-lg"></i>
                  <i class="pi pi-star-fill text-lg"></i>
                </div>
                <div class="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold text-center">
                  VERIFIED SUCCESS
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Final CTA Section -->
      <section class="py-32 bg-gradient-to-br from-red-600 via-orange-600 to-red-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <!-- Urgency Timer -->
          <div class="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-12 max-w-2xl mx-auto">
            <div class="flex items-center justify-center mb-4">
              <i class="pi pi-clock text-white text-2xl mr-3"></i>
              <span class="text-lg font-black text-white tracking-wide">LIMITED TIME OFFER</span>
            </div>
            <p class="text-white font-bold text-xl">
              Start your free trial today and get 90 days of premium protection
            </p>
          </div>

          <h2 class="text-6xl md:text-8xl font-black text-white mb-8 leading-none tracking-tight">
            DON'T LET
            <br>
            COUNTERFEITS
            <br>
            <span class="text-yellow-300">DESTROY</span>
            <br>
            YOUR BUSINESS
          </h2>
          <p class="text-2xl text-red-100 mb-16 max-w-4xl mx-auto font-medium leading-relaxed">
            Every minute you delay, counterfeiters are stealing your customers, damaging your reputation, 
            and costing you millions. Take action now before it's too late.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-8 justify-center items-center mb-12">
            <button 
              (click)="navigate('/auth/signup')"
              class="bg-white hover:bg-yellow-100 text-red-700 px-16 py-6 rounded-2xl font-black text-2xl tracking-wide transition-all duration-200 transform hover:scale-105 shadow-2xl flex items-center border-4 border-yellow-300"
            >
              <i class="pi pi-shield mr-4 text-3xl"></i>
              START FREE TRIAL NOW
            </button>
            <button 
              (click)="navigate('/documents/verify')"
              class="bg-transparent hover:bg-white/10 text-white px-16 py-6 rounded-2xl font-black text-2xl border-4 border-white hover:border-yellow-300 transition-all duration-200 transform hover:scale-105 flex items-center"
            >
              <i class="pi pi-search mr-4 text-3xl"></i>
              VERIFY DOCUMENT FREE
            </button>
          </div>

          <!-- Risk-Free Guarantee -->
          <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-4xl mx-auto">
            <div class="flex items-center justify-center mb-4">
              <i class="pi pi-check-circle text-green-300 text-3xl mr-4"></i>
              <span class="text-2xl font-black text-white">100% RISK-FREE GUARANTEE</span>
            </div>
            <p class="text-white text-lg font-semibold">
              Try NeoVerify for 90 days. If you don't catch at least one counterfeit or save money, 
              we'll refund every penny. No questions asked.
            </p>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-slate-900 text-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
            <!-- Company Info -->
            <div class="col-span-1 md:col-span-2">
              <div class="flex items-center space-x-4 mb-8">
                <div class="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <i class="pi pi-shield text-white text-2xl"></i>
                </div>
                <div>
                  <span class="text-3xl font-black tracking-tight">NeoVerify</span>
                  <div class="text-sm font-bold text-slate-400 -mt-1">Anti-Counterfeit Platform</div>
                </div>
              </div>
              <p class="text-slate-400 mb-8 max-w-md text-lg font-medium leading-relaxed">
                The world's most advanced anti-counterfeit platform. Protecting brands, 
                securing revenue, and building customer trust through military-grade technology.
              </p>
              <div class="flex space-x-4">
                <a href="#" class="w-12 h-12 bg-slate-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-110">
                  <i class="pi pi-twitter text-lg"></i>
                </a>
                <a href="#" class="w-12 h-12 bg-slate-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-110">
                  <i class="pi pi-linkedin text-lg"></i>
                </a>
                <a href="#" class="w-12 h-12 bg-slate-800 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:scale-110">
                  <i class="pi pi-github text-lg"></i>
                </a>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h3 class="font-black text-xl mb-6 tracking-wide">PRODUCT</h3>
              <ul class="space-y-4 text-slate-400">
                <li><a href="#features" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">FEATURES</a></li>
                <li><a href="#solutions" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">SOLUTIONS</a></li>
                <li><a href="#pricing" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">PRICING</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">API DOCS</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">INTEGRATIONS</a></li>
              </ul>
            </div>

            <!-- Support -->
            <div>
              <h3 class="font-black text-xl mb-6 tracking-wide">SUPPORT</h3>
              <ul class="space-y-4 text-slate-400">
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">HELP CENTER</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">CONTACT US</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">LIVE CHAT</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">PRIVACY POLICY</a></li>
                <li><a href="#" class="hover:text-white transition-colors font-semibold text-sm tracking-wide hover:translate-x-2 transform duration-200 block">TERMS OF SERVICE</a></li>
              </ul>
            </div>
          </div>

          <div class="border-t border-slate-800 mt-16 pt-8">
            <div class="flex flex-col md:flex-row justify-between items-center">
              <p class="text-slate-400 font-semibold">&copy; 2024 NeoVerify. All rights reserved. Eliminating counterfeits worldwide.</p>
              <div class="flex items-center space-x-6 mt-4 md:mt-0">
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span class="text-slate-400 font-semibold text-sm">SYSTEM STATUS: OPERATIONAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    
    /* Professional typography enhancements */
    h1, h2, h3 {
      letter-spacing: -0.025em;
      line-height: 1.1;
    }
    
    /* Enhanced button hover effects */
    button {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Professional shadow system */
    .shadow-3xl {
      box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
    }
    
    /* Border width utilities */
    .border-3 {
      border-width: 3px;
    }
    
    .border-4 {
      border-width: 4px;
    }
    
    /* Professional gradient overlays */
    .bg-gradient-overlay {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
    }
    
    /* Enhanced animations */
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-slide-in-up {
      animation: slideInUp 0.6s ease-out;
    }
    
    /* Professional focus states */
    button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    
    /* Enhanced text gradients */
    .text-gradient-primary {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .text-gradient-danger {
      background: linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #dc2626 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `]
})
export class LandingComponent {
  readonly features: Feature[] = [
    {
      icon: 'pi pi-eye',
      title: 'MILITARY-GRADE AI FORENSICS',
      description: 'Deploy the same AI technology used by defense agencies to detect even the most sophisticated counterfeits. 99.9% accuracy guaranteed or your money back.',
      color: 'bg-gradient-to-br from-red-600 to-orange-600',
      actionText: 'DEPLOY AI NOW'
    },
    {
      icon: 'pi pi-lock',
      title: 'UNBREAKABLE BLOCKCHAIN',
      description: 'Create tamper-proof verification records that even nation-states cannot forge. Your documents become mathematically impossible to counterfeit.',
      color: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      actionText: 'SECURE DOCUMENTS'
    },
    {
      icon: 'pi pi-bolt',
      title: 'LIGHTNING-FAST RESULTS',
      description: 'Get verification results in under 2.3 seconds. Stop counterfeits before they reach your customers and damage your reputation.',
      color: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      actionText: 'VERIFY INSTANTLY'
    },
    {
      icon: 'pi pi-qrcode',
      title: 'SMART QR PROTECTION',
      description: 'Generate quantum-encrypted QR codes that customers can scan to instantly verify authenticity. Turn every customer into a counterfeit detector.',
      color: 'bg-gradient-to-br from-green-600 to-emerald-600',
      actionText: 'CREATE QR CODES'
    },
    {
      icon: 'pi pi-chart-line',
      title: 'THREAT INTELLIGENCE',
      description: 'Real-time analytics reveal counterfeit patterns, fraud attempts, and emerging threats. Stay ahead of criminals targeting your brand.',
      color: 'bg-gradient-to-br from-purple-600 to-pink-600',
      actionText: 'VIEW ANALYTICS'
    },
    {
      icon: 'pi pi-mobile',
      title: 'MOBILE COMMAND CENTER',
      description: 'Verify documents anywhere, anytime with our mobile-first platform. Your anti-counterfeit protection never sleeps.',
      color: 'bg-gradient-to-br from-indigo-600 to-purple-700',
      actionText: 'GO MOBILE'
    }
  ];

  readonly statistics: Statistic[] = [
    { value: '99.9%', label: 'Detection Accuracy', icon: 'pi pi-check-circle', trend: '↑ 15% this month' },
    { value: '50K+', label: 'Protected Brands', icon: 'pi pi-building', trend: '↑ 2,500 new this week' },
    { value: '10M+', label: 'Counterfeits Stopped', icon: 'pi pi-shield', trend: '↑ 50K blocked today' },
    { value: '2.3s', label: 'Average Response', icon: 'pi pi-clock', trend: '↓ 0.7s faster' }
  ];

  readonly actionCards: ActionCard[] = [
    {
      title: 'STOP REVENUE THEFT',
      description: 'Counterfeits are stealing $2.3M from your company every month. Deploy NeoVerify and reclaim your profits immediately.',
      icon: 'pi pi-dollar',
      buttonText: 'PROTECT REVENUE NOW',
      route: '/auth/signup',
      color: 'bg-gradient-to-br from-red-600/90 to-orange-600/90 border-red-400/50'
    },
    {
      title: 'SAVE YOUR REPUTATION',
      description: 'One counterfeit scandal can destroy decades of brand building. Prevent reputation damage before it happens.',
      icon: 'pi pi-heart',
      buttonText: 'PROTECT BRAND NOW',
      route: '/auth/signup',
      color: 'bg-gradient-to-br from-blue-600/90 to-indigo-600/90 border-blue-400/50'
    },
    {
      title: 'VERIFY INSTANTLY',
      description: 'Suspicious document? Get instant verification results and protect your customers from fraud in seconds.',
      icon: 'pi pi-search',
      buttonText: 'VERIFY NOW - FREE',
      route: '/documents/verify',
      color: 'bg-gradient-to-br from-green-600/90 to-emerald-600/90 border-green-400/50'
    }
  ];

  readonly testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Chief Security Officer',
      company: 'TechCorp Industries',
      industry: 'Technology',
      content: 'NeoVerify saved us $12M in the first year by stopping counterfeit components. The ROI was immediate and the peace of mind is priceless.',
      avatar: 'SC'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Compliance Director',
      company: 'Global Finance Ltd',
      industry: 'Financial Services',
      content: 'We went from 47 fraud incidents per month to zero. Our customers trust us completely now, and our insurance premiums dropped 60%.',
      avatar: 'MR'
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Academic Registrar',
      company: 'University of Excellence',
      industry: 'Education',
      content: 'Fake diplomas were destroying our reputation. NeoVerify eliminated the problem overnight. Now employers trust our graduates completely.',
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