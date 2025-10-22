import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS } from '../../shared';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface Statistic {
  value: string;
  label: string;
  icon: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <div class="min-h-screen bg-white">
      <!-- Navigation Header -->
      <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <!-- Logo -->
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <i class="pi pi-shield text-white text-lg"></i>
              </div>
              <span class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                NeoVerify
              </span>
            </div>

            <!-- Navigation Links -->
            <div class="hidden md:flex items-center space-x-8">
              <a href="#features" class="text-gray-600 hover:text-purple-600 font-medium transition-colors">Features</a>
              <a href="#how-it-works" class="text-gray-600 hover:text-purple-600 font-medium transition-colors">How It Works</a>
              <a href="#testimonials" class="text-gray-600 hover:text-purple-600 font-medium transition-colors">Testimonials</a>
              <a href="#pricing" class="text-gray-600 hover:text-purple-600 font-medium transition-colors">Pricing</a>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-4">
              <button 
                (click)="navigate('/auth/login')"
                class="text-gray-600 hover:text-purple-600 font-medium transition-colors"
              >
                Sign In
              </button>
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 pt-16 pb-24">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div class="absolute top-0 right-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div class="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            <!-- Hero Badge -->
            <div class="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-purple-200 mb-8">
              <i class="pi pi-star-fill text-yellow-500 mr-2"></i>
              <span class="text-sm font-medium text-gray-700">Trusted by 10,000+ organizations worldwide</span>
            </div>

            <!-- Hero Title -->
            <h1 class="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Stop
              <span class="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                Counterfeits
              </span>
              <br>
              Protect Your
              <span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Brand
              </span>
            </h1>

            <!-- Hero Subtitle -->
            <p class="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Advanced AI-powered document verification and blockchain technology to combat counterfeiting. 
              Verify authenticity in seconds, protect your customers, and build unshakeable trust.
            </p>

            <!-- Hero CTA -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                (click)="navigate('/auth/signup')"
                class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center"
              >
                <i class="pi pi-shield mr-3"></i>
                Start Protecting Now
              </button>
              <button 
                (click)="scrollToDemo()"
                class="bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 flex items-center"
              >
                <i class="pi pi-play mr-3"></i>
                Watch Demo
              </button>
            </div>

            <!-- Trust Indicators -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              @for (stat of statistics; track stat.label) {
                <div class="text-center">
                  <div class="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl mb-3">
                    <i [class]="stat.icon + ' text-purple-600 text-xl'"></i>
                  </div>
                  <div class="text-3xl font-bold text-gray-900">{{ stat.value }}</div>
                  <div class="text-sm text-gray-600">{{ stat.label }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-20">
            <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose NeoVerify?
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Our cutting-edge technology combines AI forensics, blockchain security, and user-friendly design 
              to deliver the most comprehensive anti-counterfeit solution available.
            </p>
          </div>

          <!-- Features Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (feature of features; track feature.title) {
              <div class="group bg-white p-8 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div [class]="'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 ' + feature.color">
                  <i [class]="feature.icon + ' text-2xl text-white'"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-4">{{ feature.title }}</h3>
                <p class="text-gray-600 leading-relaxed">{{ feature.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section id="how-it-works" class="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Section Header -->
          <div class="text-center mb-20">
            <h2 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Three simple steps to secure your documents and protect against counterfeiting
            </p>
          </div>

          <!-- Process Steps -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Step 1 -->
            <div class="text-center">
              <div class="relative mb-8">
                <div class="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <i class="pi pi-upload text-white text-3xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-gray-900">1</span>
                </div>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Upload Document</h3>
              <p class="text-gray-600 leading-relaxed">
                Simply upload your document or certificate. Our system supports PDFs, images, and various document formats.
              </p>
            </div>

            <!-- Step 2 -->
            <div class="text-center">
              <div class="relative mb-8">
                <div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <i class="pi pi-cog text-white text-3xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-gray-900">2</span>
                </div>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">AI Analysis</h3>
              <p class="text-gray-600 leading-relaxed">
                Our advanced AI forensics engine analyzes the document for tampering, authenticity markers, and digital signatures.
              </p>
            </div>

            <!-- Step 3 -->
            <div class="text-center">
              <div class="relative mb-8">
                <div class="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <i class="pi pi-verified text-white text-3xl"></i>
                </div>
                <div class="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-gray-900">3</span>
                </div>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-4">Blockchain Verification</h3>
              <p class="text-gray-600 leading-relaxed">
                Get instant verification results with blockchain-backed proof of authenticity and a shareable verification certificate.
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