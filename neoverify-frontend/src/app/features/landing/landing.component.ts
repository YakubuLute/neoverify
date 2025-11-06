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
      <section id="features" class="py-20 bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-16">
            <div class="inline-block bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full font-normal text-sm mb-6 border border-cyan-500/30">
              Enterprise-Grade Protection
            </div>
            <h2 class="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight">
              Advanced Anti-Counterfeit Technology
            </h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Deploy cutting-edge AI and blockchain technology to eliminate counterfeits 
              and protect your brand reputation.
            </p>
          </div>

          <!-- Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (feature of features; track feature.title) {
              <div class="group bg-gray-900/50 p-8 rounded-xl border border-gray-700 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300">
                <div [class]="'inline-flex items-center justify-center w-14 h-14 rounded-lg mb-6 ' + feature.color">
                  <i [class]="feature.icon + ' text-2xl text-gray-900'"></i>
                </div>
                <h3 class="text-xl font-semibold text-white mb-4">{{ feature.title }}</h3>
                <p class="text-gray-300 leading-relaxed text-base mb-6 font-normal">{{ feature.description }}</p>
                <button class="bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25">
                  {{ feature.actionText }}
                </button>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Solutions Section -->
      <section id="solutions" class="py-20 bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-16">
            <div class="inline-block bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full font-normal text-sm mb-6 border border-purple-500/30">
              Take Action Now
            </div>
            <h2 class="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight">
              Stop Losing Revenue to Counterfeits
            </h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Every day you wait, counterfeiters steal more revenue and damage your reputation. 
              Protect your business now.
            </p>
          </div>

          <!-- Action Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @for (actionCard of actionCards; track actionCard.title) {
              <div [class]="'group p-8 rounded-xl border hover:shadow-xl transition-all duration-300 ' + actionCard.color">
                <div class="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-lg mb-6">
                  <i [class]="actionCard.icon + ' text-2xl text-gray-300'"></i>
                </div>
                <h3 class="text-xl font-semibold text-white mb-4">{{ actionCard.title }}</h3>
                <p class="text-gray-400 leading-relaxed text-base mb-6 font-normal">{{ actionCard.description }}</p>
                <button 
                  (click)="navigate(actionCard.route)"
                  class="bg-[#2f254e] hover:bg-[#36295e] text-[#a479e3] px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 w-full"
                >
                  {{ actionCard.buttonText }}
                </button>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section id="how-it-works" class="py-20 bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-16">
            <div class="inline-block bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full font-normal text-sm mb-6 border border-cyan-500/30">
              Simple 3-Step Process
            </div>
            <h2 class="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight">
              How It Works
            </h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed">
              Deploy enterprise-grade anti-counterfeit protection in minutes. 
              No technical expertise required.
            </p>
          </div>

          <!-- Process Steps -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Step 1 -->
            <div class="text-center group">
              <div class="relative mb-8">
                <div class="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-upload text-gray-900 text-2xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-sm font-semibold text-white">1</span>
                </div>
              </div>
              <h3 class="text-xl font-semibold text-white mb-4">Upload & Secure</h3>
              <p class="text-gray-300 leading-relaxed text-base font-normal">
                Upload your documents instantly. Our AI creates an unbreakable digital fingerprint 
                and stores it on the blockchain.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="text-center group">
              <div class="relative mb-8">
                <div class="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-eye text-white text-2xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-sm font-semibold text-gray-900">2</span>
                </div>
              </div>
              <h3 class="text-xl font-semibold text-white mb-4">AI Analysis</h3>
              <p class="text-gray-300 leading-relaxed text-base font-normal">
                Advanced AI analyzes every pixel for tampering and authenticity markers 
                with 99.9% accuracy in under 3 seconds.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="text-center group">
              <div class="relative mb-8">
                <div class="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform duration-300">
                  <i class="pi pi-verified text-gray-900 text-2xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-sm font-semibold text-white">3</span>
                </div>
              </div>
              <h3 class="text-xl font-semibold text-white mb-4">Instant Proof</h3>
              <p class="text-gray-300 leading-relaxed text-base font-normal">
                Get tamper-proof verification certificates with QR codes. Share with customers 
                and partners instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section id="testimonials" class="py-20 bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-16">
            <div class="inline-block bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full font-normal text-sm mb-6 border border-purple-500/30">
              Customer Success Stories
            </div>
            <h2 class="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight">
              Trusted by Industry Leaders
            </h2>
            <p class="text-lg text-gray-300 max-w-3xl mx-auto font-normal leading-relaxed">
              See how companies eliminated counterfeits and protected their revenue with NeoVerify.
            </p>
          </div>

          <!-- Testimonials Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            @for (testimonial of testimonials; track testimonial.name) {
              <div class="bg-gray-800/50 p-8 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                <div class="flex items-center mb-6">
                  <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <span class="text-white font-semibold text-lg">{{ testimonial.avatar }}</span>
                  </div>
                  <div>
                    <div class="font-semibold text-white text-base">{{ testimonial.name }}</div>
                    <div class="text-sm font-normal text-gray-400">{{ testimonial.role }}</div>
                    <div class="text-sm text-purple-400 font-normal">{{ testimonial.company }}</div>
                  </div>
                </div>
                <p class="text-gray-300 leading-relaxed text-base font-normal mb-6">
                  "{{ testimonial.content }}"
                </p>
                <div class="flex text-cyan-400 mb-4">
                  <i class="pi pi-star-fill text-sm"></i>
                  <i class="pi pi-star-fill text-sm"></i>
                  <i class="pi pi-star-fill text-sm"></i>
                  <i class="pi pi-star-fill text-sm"></i>
                  <i class="pi pi-star-fill text-sm"></i>
                </div>
                <div class="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-normal text-center border border-cyan-500/30">
                  Verified Success
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Final CTA Section -->
      <section class="py-20 bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl md:text-4xl font-semibold text-white mb-6 leading-tight">
            Ready to Protect Your Brand?
          </h2>
          <p class="text-lg text-gray-300 mb-12 max-w-3xl mx-auto font-normal leading-relaxed">
            Join thousands of organizations using NeoVerify to combat counterfeiting 
            and build customer trust.
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button 
              (click)="navigate('/auth/signup')"
              class="bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 flex items-center"
            >
              <i class="pi pi-shield mr-3"></i>
              Start Free Trial
            </button>
            <button 
              (click)="navigate('/documents/verify')"
              class="bg-transparent hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-normal text-lg border border-gray-600 hover:border-cyan-500 transition-all duration-200 flex items-center"
            >
              <i class="pi pi-search mr-3"></i>
              Verify Document Now
            </button>
          </div>

          <!-- Risk-Free Guarantee -->
          <div class="bg-gray-900/50 border border-gray-700 rounded-xl p-10 max-w-2xl mx-auto">
            <div class="flex items-center justify-center mb-3">
              <i class="pi pi-check-circle text-cyan-400 text-xl mr-3"></i>
              <span class="text-lg font-semibold text-white">30-Day Money-Back Guarantee</span>
            </div>
            <p class="text-gray-300 text-base font-light mt-6">
              Try NeoVerify risk-free. If you're not completely satisfied, 
              we'll refund your money within 30 days.
            </p>
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
                <div class="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <i class="pi pi-shield text-gray-900 text-lg"></i>
                </div>
                <div>
                  <span class="text-xl font-semibold">NeoVerify</span>
                  <div class="text-sm font-normal text-gray-400 -mt-1">Anti-Counterfeit Platform</div>
                </div>
              </div>
              <p class="text-gray-400 mb-6 max-w-md text-base font-normal leading-relaxed">
                Advanced anti-counterfeit platform protecting brands and building customer trust 
                through AI and blockchain technology.
              </p>
              <div class="flex space-x-4">
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-twitter text-sm"></i>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-linkedin text-sm"></i>
                </a>
                <a href="#" class="w-10 h-10 bg-gray-800 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors">
                  <i class="pi pi-github text-sm"></i>
                </a>
              </div>
            </div>

            <!-- Quick Links -->
            <div>
              <h3 class="font-semibold text-lg mb-4">Product</h3>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#features" class="hover:text-cyan-400 transition-colors font-normal text-sm">Features</a></li>
                <li><a href="#solutions" class="hover:text-cyan-400 transition-colors font-normal text-sm">Solutions</a></li>
                <li><a href="#pricing" class="hover:text-cyan-400 transition-colors font-normal text-sm">Pricing</a></li>
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">API</a></li>
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">Integrations</a></li>
              </ul>
            </div>

            <!-- Support -->
            <div>
              <h3 class="font-semibold text-lg mb-4">Support</h3>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">Help Center</a></li>
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">Contact Us</a></li>
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">Privacy Policy</a></li>
                <li><a href="#" class="hover:text-cyan-400 transition-colors font-normal text-sm">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div class="border-t border-gray-800 mt-12 pt-8 text-center">
            <div class="flex flex-col md:flex-row justify-between items-center">
              <p class="text-gray-400 font-normal text-sm">&copy; 2024 NeoVerify. All rights reserved.</p>
              <div class="flex items-center space-x-2 mt-4 md:mt-0">
                <div class="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span class="text-gray-400 font-normal text-sm">System Operational</span>
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
    }
    
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    /* Consistent typography */
    h1, h2, h3 {
      letter-spacing: -0.025em;
    }
    
    /* Smooth transitions */
    button {
      transition: all 0.2s ease;
    }
    
    /* Neon glow effects */
    .shadow-cyan {
      box-shadow: 0 10px 25px -3px rgba(6, 182, 212, 0.25);
    }
    
    .shadow-purple {
      box-shadow: 0 10px 25px -3px rgba(168, 85, 247, 0.25);
    }
    
    /* Focus states */
    button:focus-visible {
      outline: 2px solid #06b6d4;
      outline-offset: 2px;
    }
  `]
})
export class LandingComponent {
  readonly features: Feature[] = [
    {
      icon: 'pi pi-eye',
      title: 'AI Forensics Detection',
      description: 'Advanced machine learning algorithms detect document tampering and forgeries with 99.9% accuracy in real-time.',
      color: 'bg-cyan-500',
      actionText: 'Learn More'
    },
    {
      icon: 'pi pi-lock',
      title: 'Blockchain Security',
      description: 'Immutable verification records stored on blockchain ensure tamper-proof authenticity certificates.',
      color: 'bg-purple-500',
      actionText: 'Secure Now'
    },
    {
      icon: 'pi pi-bolt',
      title: 'Instant Verification',
      description: 'Get verification results in under 3 seconds with real-time processing and immediate feedback.',
      color: 'bg-cyan-500',
      actionText: 'Try Now'
    },
    {
      icon: 'pi pi-qrcode',
      title: 'QR Code Integration',
      description: 'Generate secure QR codes for easy document sharing and verification by customers and partners.',
      color: 'bg-purple-500',
      actionText: 'Generate QR'
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights into verification patterns, fraud attempts, and document authenticity trends.',
      color: 'bg-cyan-500',
      actionText: 'View Analytics'
    },
    {
      icon: 'pi pi-mobile',
      title: 'Mobile-First Design',
      description: 'Seamless experience across all devices with responsive design and native mobile app support.',
      color: 'bg-purple-500',
      actionText: 'Download App'
    }
  ];

  readonly statistics: Statistic[] = [
    { value: '99.9%', label: 'Accuracy Rate', icon: 'pi pi-check-circle', trend: '↑ 15% this month' },
    { value: '10K+', label: 'Organizations', icon: 'pi pi-building', trend: '↑ 500 new this week' },
    { value: '1M+', label: 'Documents Verified', icon: 'pi pi-file', trend: '↑ 10K today' },
    { value: '<3s', label: 'Verification Time', icon: 'pi pi-clock', trend: '↓ 0.5s faster' }
  ];

  readonly actionCards: ActionCard[] = [
    {
      title: 'Protect Revenue',
      description: 'Stop counterfeits from stealing your profits. Deploy advanced protection and reclaim lost revenue immediately.',
      icon: 'pi pi-dollar',
      buttonText: 'Start Protection',
      route: '/auth/signup',
      color: 'bg-gray-800/80 border-cyan-500/30'
    },
    {
      title: 'Save Reputation',
      description: 'Prevent counterfeit scandals from damaging your brand. Build unshakeable customer trust.',
      icon: 'pi pi-heart',
      buttonText: 'Protect Brand',
      route: '/auth/signup',
      color: 'bg-gray-800/80 border-purple-500/30'
    },
    {
      title: 'Verify Documents',
      description: 'Suspicious document? Get instant verification results and protect customers from fraud.',
      icon: 'pi pi-search',
      buttonText: 'Verify Free',
      route: '/documents/verify',
      color: 'bg-gray-800/80 border-cyan-500/30'
    }
  ];

  readonly testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Chief Security Officer',
      company: 'TechCorp Industries',
      industry: 'Technology',
      content: 'NeoVerify eliminated our counterfeit problem completely. The AI detection caught forgeries our previous system missed entirely.',
      avatar: 'SC'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Compliance Director',
      company: 'Global Finance Ltd',
      industry: 'Financial Services',
      content: 'The blockchain integration gives us complete confidence. Our audit compliance improved dramatically with tamper-proof records.',
      avatar: 'MR'
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Academic Registrar',
      company: 'University of Excellence',
      industry: 'Education',
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