# MyClara MVP Documentation - Frontend Development

## 1. Executive Summary

### Product Presentation

MyClara is an educational SaaS platform that enables teachers to create and manage educational modules and classes, while students access interactive learning tools powered by Clara, an AI assistant with RAG (Retrieval-Augmented Generation) capabilities.

### Problem Statement

Traditional learning platforms lack intelligent, context-aware assistance. Students struggle with finding relevant information, generating practice questions, creating visual study aids, and getting personalized answers. Teachers face challenges organizing materials and providing personalized support at scale.

### Target Audience

Primary users are students (high school, college, university) and teachers/educators. Secondary users include educational institutions and self-learners.

### MVP Objectives

Validate that students and teachers will adopt AI-powered learning assistants providing context-aware, personalized educational support. Additional hypotheses: users find value in automated exercise generation and visual revision tools, AI chat increases engagement, and a simple frontend interface enables quick adoption.

---

## 2. Product Description

### How It Works

MyClara consists of three components:
1. Frontend Application (Vanilla JavaScript, HTML/CSS) - Role-based authentication, module management, three AI learning modes, state management
2. Backend API (PHP/MySQL) - Authentication, CRUD operations, file management, enrollment
3. RAG API Server (Python/FastAPI) - Azure Cognitive Search, Azure OpenAI (Grok-3), AI features

### Primary Use Cases

Students: Upload course materials, ask AI questions, generate practice exercises, create visual mindmaps. Teachers: Create classes, distribute materials, manage student enrollment, organize modules.

### Value Proposition

Context-aware AI understands course-specific content through RAG. Integrated learning tools combine chat, exercises, and visual aids. Lightweight vanilla JavaScript frontend ensures fast loading. State persistence using localStorage and IndexedDB. Complete teacher-student workflow.

---

## 3. Hypotheses to Validate

### Primary Hypothesis

Students and teachers will actively use an AI-powered educational assistant providing context-aware, personalized learning support based on uploaded course materials.

### Secondary Hypotheses

1. AI chat increases engagement time by 40%+
2. Students use auto-generated exercises 3x per week
3. Lesson Schematiser preferred by 60%+ over traditional notes
4. Users complete onboarding (first module) within 5 minutes
5. 70%+ return within 7 days
6. Users accept freemium model with premium AI features

### Success Metrics

Activation rate (% creating first module within 24h), feature adoption (% trying each AI feature), session duration, return rate (% returning within 7 days), module creation average.

---

## 4. MVP Features

### Core Features (Must-Have)

**Role-Based Authentication**: Student and teacher role selection, login/signup with form validation, session management via localStorage, role-specific dashboards.

**Module Management**: Students create modules with file uploads, view/manage personal modules. Teachers create classes with modules, manage class modules, handle student enrollment.

**AI-Powered Learning Modes**:
- AI Chatbot: Real-time chat with Clara, conversation history per module, state persistence, loading states
- Practice Exercises: Multiple-choice generation, answer selection/feedback, progress tracking, state preservation
- Lesson Schematiser: Revision sheet generation, interactive mindmap visualization (D3.js + Markmap), hierarchical concepts

**State Management**: localStorage for sessions/preferences, IndexedDB for module data, state persistence across navigation, automatic restoration.

**Responsive UI**: Modern gradient design, icon-based navigation, loading indicators, error handling.

### Features NOT Included

Mobile native apps, real-time collaboration, video/audio support, advanced analytics, social features, payment integration, multi-language support, advanced file types (images/videos).

### Feature Prioritization

P0 (Must-Have): Role selection/auth, module management, all three AI interfaces, state persistence - All implemented. P1 (Should-Have): File upload progress, advanced error handling - Partial. P2 (Nice-to-Have): Theme toggle, keyboard shortcuts, export mindmaps - Not in MVP.

---

## 5. User Flow

### Student Journey

**Onboarding**: Homepage → Role Selection → Student Signup → Student Login → Student Dashboard

**Module Creation**: Dashboard → Add Module → Enter name, upload files → Submit → Module appears in sidebar

**Learning Mode**: Select module → Choose mode (Chat/Exercises/Schematiser) → Interface loads → Interact → State saved

**Module Management**: Dashboard → Modify Modules → List/delete modules → Return to dashboard

### Teacher Journey

**Onboarding**: Homepage → Role Selection → Teacher Signup/Login → Teacher Dashboard

**Class Creation**: Dashboard → Create Class → Enter name, upload files, create modules → Submit → Class appears

**Class Management**: Dashboard → View classes → Manage modules → Handle enrollments

### Frontend State Flow

User Action → Frontend JavaScript Handler → API Call (PHP/RAG) → Update UI → State Update (localStorage/IndexedDB) → Persist

---

## 6. Technical Architecture

### Frontend Technology Stack

**Core**: HTML5, CSS3, Vanilla JavaScript (ES6+), no framework dependencies

**Libraries**: D3.js v7 (mindmap visualization), Markmap View (mindmap rendering), all stored locally

### Frontend Architecture

**Component Structure**:
- HTML Pages: Views (index.html, student-*.html, teacher-*.html)
- JavaScript Modules: Controllers (clara-client.js, chat-interface.js, exercises-interface.js, revision-interface.js, dashboard controllers)
- CSS Stylesheets: global.css, page-specific, component-specific
- Assets: icons (SVG), images, libs (JavaScript libraries)

### Key Frontend Components

**Clara Client** (clara-client.js): Centralized RAG API communication, HTTP requests, error handling, request/response transformation.

**Chat Interface** (chat-interface.js): Message input/display, conversation history, state persistence, loading states.

**Exercises Interface** (exercises-interface.js): Question generation, multiple-choice display, answer validation, progress tracking.

**Revision Interface** (revision-interface.js): Revision sheet generation, mindmap parsing, D3.js/Markmap integration, visualization.

**Dashboard Controllers**: Module/class management, learning mode switching, state coordination, API integration.

### State Management

**localStorage**: User session, current module, UI preferences, temporary state

**IndexedDB**: Module file metadata, large data storage, offline preparation

**In-Memory**: Current conversation history, exercise progress, mindmap data, UI states

### API Integration

**PHP Backend** (myclara-api/): Signup, login, list modules, create modules, create classes, enroll students. Frontend uses fetch API with async/await.

**RAG API** (localhost:8000): POST /chat/, POST /exercises/, POST /revision/. Frontend communicates via clara-client.js wrapper.

### Frontend Security

Authentication via localStorage sessions, API calls include user context, role-based routing, client-side form validation, file type validation, XSS prevention, CORS configured for localhost.

### Performance Optimizations

Lazy loading of learning mode interfaces, libraries loaded on demand, state caching in IndexedDB, minimal dependencies (no heavy frameworks), efficient DOM updates with event delegation.

---

## 7. Design & UX

### Design Principles

Simplicity first, clear visual hierarchy, consistent iconography (SVG icons), modern aesthetics (gradients, transitions), accessibility (semantic HTML, ARIA labels).

### Frontend Pages

**Homepage** (index.html): Role selection with student/teacher cards, gradient background, fade-in animations

**Student Pages**: Signup/login forms, dashboard (three-column: modules sidebar, main content, learning modes), create module (name input, file upload), manage modules (list/delete)

**Teacher Pages**: Similar structure - login/signup, dashboard, create class, manage modules

### UI Components

**Buttons**: Primary (gradient), learning mode (icon + text, disabled state), action buttons

**Forms**: Styled inputs with focus states, custom file upload, real-time validation

**Cards**: Module cards, role selection cards, feature cards

**Icons**: SVG icons for roles, features, actions (student, teacher, ai-chat, exercises, lesson-schematiser, add, module, upload, help)

### Styling

Gradient-based design system, dark theme with gradient overlays, high contrast text, color-coded features, desktop-first with tablet support, fade-in animations, smooth transitions, loading indicators.

---

## 8. Testing Plan

### Test Types

**Functional**: Module management (create/delete/select), learning modes (chat messages, exercise generation, mindmap rendering), state management (persistence, restoration, localStorage/IndexedDB operations)

**UI/UX**: Complete user flows (onboarding, module creation, learning modes), cross-browser testing (Chrome, Firefox, Edge, Safari), accessibility (keyboard navigation, screen readers, color contrast)

**Integration**: PHP backend API calls, RAG API calls, error handling, state synchronization (frontend ↔ backend)

**Performance**: Load time, API response time, state operations performance, mindmap rendering with large datasets

### Test Scenarios

**Critical Paths**: Student registration → module creation → AI chat, teacher class creation → student enrollment, learning mode switching with state preservation

**Edge Cases**: Empty states, API failures, large data, concurrent actions

### Validation Criteria

Time to Interactive < 3s, First Contentful Paint < 1.5s, error rate < 1%, state persistence 100%, onboarding completion 80%+, feature discovery 70%+, session duration 15+ min, return rate 60%+.

---

## 9. Product Roadmap

### MVP Version (Current)

Delivered: Role-based auth UI, module/class management, three AI interfaces, state persistence, responsive dashboards, file upload UI, mindmap visualization.

Limitations: Basic error handling, limited mobile optimization, partial offline mode, basic accessibility.

### Post-MVP Improvements (V1)

Enhanced UI/UX (animations, theme toggle, customizable layouts, improved mobile), full offline mode, advanced caching, export mindmaps, keyboard shortcuts, advanced search, notifications, progress tracking, code splitting, service workers, WCAG 2.1 AA compliance.

### Future Versions (V2+)

Real-time collaboration, advanced analytics, mobile apps, LMS integrations, voice interaction, image analysis.

---

## 10. Launch Plan

### Acquisition Strategy

**Phase 1 - Private Beta** (Weeks 1-4): 20-50 early adopters via personal networks, educational institutions, social media. Focus: feedback, bug fixes, validate hypotheses.

**Phase 2 - Public Beta** (Weeks 5-12): 200-500 users via landing page, educational forums, content marketing. Focus: scale testing, refinement, testimonials.

**Phase 3 - Official Launch** (Week 13+): 1000+ users via Product Hunt, conferences, paid advertising, influencer partnerships.

### Target Audiences

1. College/university students (primary) - tech-savvy, high engagement
2. Teachers/educators (primary) - content creators, influence adoption
3. High school students (secondary) - exam preparation
4. Self-learners (tertiary) - professionals, continuing education

### Key Messages

Students: "AI-powered study companion that understands your course materials" - "Generate practice questions, create visual study aids, get instant answers"

Teachers: "Empower students with AI-enhanced learning tools" - "Distribute materials and provide personalized AI assistance"

### Launch Channels

Digital marketing (landing page, SEO, social media, email), community engagement (Reddit, Discord, forums), partnerships (institutions, review sites, content creators), content marketing (blog posts, tutorials, case studies).

---

## 11. Business Model

### Pricing Hypothesis (Post-MVP)

**Freemium Model**:
- Free: 3 modules, 50 AI messages/month, 10 exercises/month, 5 revision sheets/month
- Premium ($9.99/month): Unlimited modules/interactions, priority support, analytics, exports
- Institutional (custom): Multi-user, admin dashboard, custom branding, API access

### MVP Costs

Development: Frontend completed, free tools/libraries, local hosting. Infrastructure (post-MVP): Web hosting $10-50/month, database included, Azure services $100-200/month for 1000 users.

### Revenue Estimates

Conservative (1000 users): 800 free, 200 premium = $1,998 MRR, $23,976 ARR. Optimistic (5000 users): 3500 free, 1500 premium = $14,985 MRR, $179,820 ARR.

### Revenue Hypotheses

20-30% free-to-premium conversion, CAC < $10, LTV $120+, churn < 5% monthly.

---

## 12. Risks & Limitations

### Technical Risks (Frontend)

**Browser Compatibility**: Older browsers may not support ES6+. Mitigation: polyfills, graceful degradation.

**State Management**: Synchronization issues between localStorage, IndexedDB, API. Mitigation: error handling, validation, fallbacks.

**Performance**: Mindmap rendering may slow with large datasets. Mitigation: pagination, lazy loading, optimization.

**API Dependency**: Frontend depends on RAG API availability. Mitigation: error handling, retry logic, offline state.

**File Upload**: Large files may cause timeouts. Mitigation: size limits, chunked uploads, progress indicators.

### Market Risks

Low adoption (mitigation: clear value prop, onboarding), competition from established players (mitigation: differentiation, rapid iteration), pricing sensitivity (mitigation: value-based pricing, free tier value).

### MVP Limitations

Frontend: Basic mobile support, partial offline, basic accessibility, English only, no real-time collaboration, basic error recovery, not optimized for 1000+ modules. Backend: Not optimized for high concurrency, basic security, manual backups, basic monitoring.

### Risk Mitigation

Technical debt management, user feedback loop, incremental improvements, backup plans, monitoring (post-MVP).

---

## Appendix: Frontend Development Notes

### Key Files

**JavaScript**: clara-client.js (RAG API client), chat-interface.js, exercises-interface.js, revision-interface.js, student-dashboard.js (350+ lines), teacher-dashboard.js, indexeddb.js

**Styling**: global.css (shared styles, design system), page-specific CSS, component-specific CSS

**HTML**: Role-based separation (student-*.html, teacher-*.html), semantic HTML5, modular structure

### Development Practices

Separation of concerns (HTML/CSS/JS), modular JavaScript, event delegation, async/await, error handling, logical file structure, clear naming.

### Future Improvements

Consider React/Vue for complex state (if needed), TypeScript for type safety, Webpack/Vite for optimization, Jest/Vitest for testing, reusable component library, formalized design system.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Frontend Focus**: This documentation emphasizes frontend architecture, components, and user experience.
