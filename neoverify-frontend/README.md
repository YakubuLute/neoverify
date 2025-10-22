# NeoVerify Frontend

A modern, production-ready Angular application built with the latest technologies and best practices.

## 🚀 Features

- **Angular 20** with zoneless change detection for optimal performance
- **Tailwind CSS** for utility-first styling
- **PrimeNG** for rich UI components with Aura theme
- **TypeScript** with strict mode and path mapping
- **ESLint** for code quality and consistency
- **Standalone components** architecture
- **Lazy loading** for optimal bundle size
- **Responsive design** with mobile-first approach

## 🛠️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 20.x | Frontend framework |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 3.4.x | Utility-first CSS |
| PrimeNG | 20.x | UI component library |
| ESLint | 9.x | Code linting |
| PostCSS | 8.x | CSS processing |

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                 # Core services and guards
│   ├── features/             # Feature modules
│   │   └── dashboard/        # Dashboard feature
│   ├── shared/               # Shared components and utilities
│   ├── app.config.ts         # Application configuration
│   ├── app.routes.ts         # Routing configuration
│   └── app.ts                # Root component
├── environments/             # Environment configurations
└── styles.scss              # Global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd neoverify-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200`

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server with auto-reload |
| `npm run build` | Build for production |
| `npm run build:prod` | Build with production configuration |
| `npm test` | Run unit tests |
| `npm run test:ci` | Run tests in CI mode |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Lint and fix code |
| `npm run analyze` | Analyze bundle size |

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS for styling with custom configuration:

- **Custom colors**: Primary and surface color palettes
- **Typography**: Inter font family
- **Responsive design**: Mobile-first approach
- **Dark mode**: Ready for dark theme implementation

### PrimeNG Theme

- **Aura preset**: Modern and clean design
- **Custom CSS variables**: Easy theme customization
- **Component overrides**: Tailwind-integrated styling

## 🏗️ Architecture

### Standalone Components

All components use Angular's standalone architecture:
- No NgModules required
- Direct imports in component decorators
- Better tree-shaking and performance

### Lazy Loading

Features are lazy-loaded for optimal performance:
- Route-based code splitting
- Reduced initial bundle size
- Faster application startup

### Type Safety

Strict TypeScript configuration:
- Strict mode enabled
- Path mapping for clean imports
- No implicit any types
- Comprehensive type checking

## 🔧 Configuration

### Environment Variables

Configure different environments in `src/environments/`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appName: 'NeoVerify Frontend',
  features: {
    enableAnalytics: false,
    enableLogging: true
  }
};
```

### Path Mapping

Use clean imports with configured path mapping:

```typescript
import { SomeService } from '@app/core/services/some.service';
import { SharedComponent } from '@shared/components/shared.component';
```

## 🧪 Testing

The project includes comprehensive testing setup:

- **Jasmine**: Testing framework
- **Karma**: Test runner
- **Coverage reports**: Code coverage tracking

Run tests:
```bash
npm test                # Watch mode
npm run test:ci         # Single run for CI
```

## 📦 Building

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build:prod
```

### Bundle Analysis
```bash
npm run analyze
```

## 🚀 Deployment

The application builds to the `dist/` directory and can be deployed to any static hosting service:

- **Netlify**
- **Vercel** 
- **AWS S3 + CloudFront**
- **Firebase Hosting**
- **GitHub Pages**

## 🤝 Contributing

1. Follow the established code style
2. Run linting before commits: `npm run lint`
3. Ensure tests pass: `npm test`
4. Use conventional commit messages

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using Angular, Tailwind CSS, and PrimeNG.