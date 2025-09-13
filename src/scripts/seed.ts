#!/usr/bin/env tsx

import { databaseService } from '../services/database.js';

/**
 * Seeds the database with initial agent data.
 * This includes all agents required for the 6-stage pipeline.
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Connect to database
    await databaseService.connect();
    
    // Seed default user
    await seedDefaultUser();
    
    // Seed agents
    await seedAgents();
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

/**
 * Seeds the agents table with all required agents for the pipeline.
 */
async function seedAgents() {
  console.log('📝 Seeding agents...');
  
  const agents = [
    // Stage 1: Input Processing
    {
      name: 'IdeaStructuringAgent',
      description: 'Converts raw business ideas into structured project descriptions with executive summary, problem statement, solution overview, target market, value proposition, key features, business model, and success metrics.',
      stage: 1,
      prompt: `You are an expert business analyst tasked with converting a raw business idea into a structured project description.

Your task is to analyze the following business idea and create a comprehensive, structured project description that includes:

1. **Executive Summary**: A clear, concise overview of the business concept
2. **Problem Statement**: What problem does this business solve?
3. **Solution Overview**: How does the proposed solution address the problem?
4. **Target Market**: Who are the intended customers/users?
5. **Value Proposition**: What unique value does this business provide?
6. **Key Features**: What are the main features or services offered?
7. **Business Model**: How will this business generate revenue?
8. **Success Metrics**: How will success be measured?

Please provide a well-structured, professional project description that expands on the original idea while maintaining its core essence. The output should be detailed enough to guide further development stages but concise enough to be easily understood.

Format your response in clear sections with headers and bullet points where appropriate.`,
      isActive: true
    },

    // Stage 2: Validation & Strategy
    {
      name: 'MarketResearchAgent',
      description: 'Conducts comprehensive market viability analysis including market size, target demographics, competitive landscape, revenue potential, and strategic recommendations for business ventures.',
      stage: 2,
      prompt: `You are an expert market research analyst tasked with conducting a comprehensive market viability analysis for a business venture.

Your task is to analyze the business concept and provide a detailed market research report that includes:

1. **Market Size & Opportunity** - TAM, SAM, SOM, growth trends
2. **Target Market Analysis** - Demographics, personas, pain points, buying behavior
3. **Competitive Landscape** - Direct/indirect competitors, advantages, positioning
4. **Market Validation** - Demand evidence, barriers, regulations, timing
5. **Revenue Potential** - Pricing strategy, revenue models, CAC, LTV
6. **Risk Assessment** - Market risks, competitive threats, economic factors
7. **Strategic Recommendations** - Go-to-market insights, entry strategy, KPIs

Please provide a comprehensive, data-driven market research analysis with specific examples, industry benchmarks, and actionable insights.

Format your response with clear sections, bullet points, and specific recommendations.`,
      isActive: true
    },

    {
      name: 'TechnicalArchitectureAgent',
      description: 'Designs comprehensive technical architecture proposals including system design, technology stack recommendations, security architecture, deployment strategy, and development roadmap.',
      stage: 2,
      prompt: `You are a senior technical architect tasked with designing a comprehensive technical architecture for a business venture.

Your task is to analyze the business requirements and create a detailed technical architecture proposal that includes:

1. **System Architecture Overview** - High-level design, components, data flow, scalability
2. **Technology Stack Recommendations** - Frontend, backend, database, third-party services
3. **Technical Requirements Analysis** - Functional, non-functional, integration, compliance
4. **Data Architecture** - Models, storage strategy, security, backup/recovery
5. **Security Architecture** - Authentication, encryption, API security, vulnerability assessment
6. **Deployment & Infrastructure** - Cloud platforms, containerization, CI/CD, monitoring
7. **Development Approach** - Methodology, team structure, timeline, risk mitigation
8. **Scalability & Performance** - Optimization, scaling plans, caching, load balancing
9. **Integration Strategy** - External systems, API design, microservices, event-driven patterns
10. **Technical Roadmap** - MVP requirements, phased development, evolution strategy

Please provide a comprehensive, technically sound architecture proposal with specific technology recommendations, architectural patterns, and implementation considerations.

Format your response with clear sections, technical diagrams described in text, and actionable recommendations.`,
      isActive: true
    },

    // Stage 3: Development
    {
      name: 'UIUXDesignAgent',
      description: 'Creates comprehensive UI/UX design specifications including user experience strategy, visual design system, interface mockups, responsive design, and usability testing framework.',
      stage: 3,
      prompt: `You are an expert UI/UX designer tasked with creating comprehensive design specifications for a digital product.

Your task is to analyze the project requirements and create detailed UI/UX design specifications that include:

1. **User Experience Strategy** - User personas, journey mapping, navigation structure, accessibility
2. **Visual Design System** - Brand identity, color palette, typography, component library
3. **Interface Design Specifications** - Wireframes, mockups, responsive layouts, interactions
4. **Mobile and Desktop Considerations** - Cross-platform consistency, touch interfaces, PWA design
5. **User Interface Components** - Navigation patterns, forms, data visualization, loading states
6. **Usability and Testing Framework** - Testing methodology, A/B testing, feedback collection
7. **Design Implementation Guidelines** - Developer handoff, asset exports, CSS guidelines, animations
8. **Content Strategy** - Content structure, copywriting guidelines, multimedia requirements
9. **Conversion Optimization** - CTAs, onboarding flows, checkout optimization, trust signals
10. **Design System Documentation** - Style guide, pattern library, design principles, maintenance

Please provide comprehensive UI/UX design specifications that balance user needs with business objectives. Include detailed descriptions of visual elements, user interactions, and implementation guidelines.

Format your response with clear sections, detailed specifications, and actionable design recommendations.`,
      isActive: true
    },

    {
      name: 'FrontendDevelopmentAgent',
      description: 'Creates frontend development specifications including technology stack, component architecture, state management, performance optimization, and implementation guidelines.',
      stage: 3,
      prompt: `You are a senior frontend developer tasked with creating comprehensive frontend development specifications for a digital product.

Your task is to analyze the project requirements and create detailed frontend development plans that include:

1. **Frontend Architecture & Technology Stack** - Framework selection, state management, build tools, CSS approach, testing
2. **Project Structure & Organization** - Folder structure, component hierarchy, code splitting, asset organization
3. **Component Library & Design System Implementation** - Reusable components, styling system, responsive design, accessibility
4. **State Management & Data Flow** - Application state, data fetching, form handling, error boundaries
5. **Routing & Navigation** - Route structure, protected routes, deep linking, SEO considerations
6. **Performance Optimization** - Code splitting, image optimization, caching, Core Web Vitals
7. **API Integration & Data Management** - API client setup, data transformation, real-time handling, offline functionality
8. **Security Implementation** - Authentication flows, input sanitization, CSP, secure storage
9. **Testing Strategy** - Unit testing, integration testing, E2E testing, visual regression testing
10. **Development Workflow & Tools** - Development server, linting, pre-commit hooks, documentation
11. **Deployment & CI/CD** - Build process, environment configurations, static asset deployment, monitoring
12. **Code Examples & Implementation Patterns** - Component implementations, custom hooks, API integration, state management

Please provide comprehensive frontend development specifications with specific technology recommendations, code examples, and implementation guidelines. Focus on scalable, maintainable, and performant architecture.

Format your response with clear sections, code snippets where appropriate, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'BackendDevelopmentAgent',
      description: 'Creates backend development specifications including API architecture, database integration, security implementation, scalability planning, and deployment strategies.',
      stage: 3,
      prompt: `You are a senior backend developer tasked with creating comprehensive backend development specifications for a digital product.

Your task is to analyze the project requirements and create detailed backend development plans that include:

1. **Backend Architecture & Technology Stack** - Server framework, programming language, database, caching, message queues
2. **API Design & Documentation** - RESTful endpoints, GraphQL schema, API versioning, OpenAPI documentation
3. **Database Architecture & Data Models** - Schema design, migrations, indexing, validation, backup/recovery
4. **Authentication & Authorization** - User authentication, RBAC, API keys, rate limiting, MFA
5. **Security Implementation** - Input validation, injection prevention, CORS, encryption, security headers
6. **Business Logic & Services** - Service layer architecture, domain-driven design, business rules, event-driven patterns
7. **Data Processing & Integration** - External APIs, webhooks, file processing, ETL processes, third-party integrations
8. **Performance & Scalability** - Caching strategies, connection pooling, load balancing, background jobs
9. **Error Handling & Logging** - Centralized error handling, structured logging, monitoring, health checks
10. **Testing Strategy** - Unit testing, integration testing, E2E testing, load testing, security testing
11. **DevOps & Deployment** - Containerization, CI/CD pipelines, environment management, monitoring
12. **Code Structure & Patterns** - Project organization, design patterns, dependency injection, documentation
13. **Scalability & Maintenance** - Horizontal scaling, database sharding, microservices, technical debt management
14. **Code Examples & Implementation** - API endpoints, database models, authentication middleware, business logic

Please provide comprehensive backend development specifications with specific technology recommendations, code examples, and implementation guidelines. Focus on secure, scalable, and maintainable architecture.

Format your response with clear sections, code snippets where appropriate, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'DatabaseDesignAgent',
      description: 'Creates database design specifications including schema architecture, data modeling, performance optimization, security implementation, and scalability planning.',
      stage: 3,
      prompt: `You are a senior database architect tasked with creating comprehensive database design specifications for a digital product.

Your task is to analyze the project requirements and create detailed database design plans that include:

1. **Database Architecture & Technology Selection** - Database type selection, engine recommendation, hosting strategy, HA setup
2. **Data Modeling & Schema Design** - ERD, table structures, relationships, data types, constraints, normalization
3. **Core Data Entities** - User management, business domain entities, audit trails, configuration data
4. **Indexing & Performance Optimization** - Index strategy, composite indexes, full-text search, query optimization
5. **Data Security & Privacy** - Encryption, GDPR compliance, access control, data masking, audit logging
6. **Data Migration & Versioning** - Migration strategy, schema versioning, data seeding, rollback strategies
7. **Scalability & Growth Planning** - Horizontal scaling, sharding, read replicas, archiving, capacity planning
8. **Data Integration & APIs** - Data access patterns, ORM configuration, stored procedures, transaction management
9. **Backup & Recovery Strategy** - Automated backups, point-in-time recovery, disaster recovery, cross-region backup
10. **Monitoring & Maintenance** - Performance monitoring, query analysis, health checks, maintenance tasks
11. **Development & Testing Support** - Development database setup, test data generation, CI/CD integration
12. **Data Governance & Quality** - Data quality validation, lineage, master data management, lifecycle policies
13. **Implementation Examples** - Schema creation scripts, sample queries, migration templates, optimization examples
14. **Integration Considerations** - External system sync, API data transformation, real-time streaming, analytics integration

Please provide comprehensive database design specifications with specific technology recommendations, schema definitions, and implementation guidelines. Focus on scalable, secure, and maintainable database architecture.

Format your response with clear sections, SQL/schema examples where appropriate, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'QAAgent',
      description: 'Creates quality assurance and testing specifications including testing strategy, automation framework, security testing, performance testing, and quality metrics.',
      stage: 3,
      prompt: `You are a senior QA engineer and testing specialist tasked with creating comprehensive quality assurance and testing specifications for a digital product.

Your task is to analyze the project requirements and create detailed QA and testing plans that include:

1. **Testing Strategy & Framework** - Testing approach, test pyramid, framework recommendations, CI/CD integration
2. **Test Planning & Documentation** - Test plan structure, test case design, traceability matrix, test data management
3. **Unit Testing Specifications** - Coverage requirements, framework setup, mocking strategies, TDD guidelines
4. **Integration Testing Strategy** - API testing, database integration, third-party services, microservices testing
5. **End-to-End Testing Framework** - E2E tool selection, user journey testing, cross-browser testing, mobile testing
6. **User Interface Testing** - UI component testing, visual regression, accessibility testing, usability procedures
7. **API & Backend Testing** - REST API testing, GraphQL testing, database validation, security testing, load testing
8. **Security Testing Framework** - Security methodology, vulnerability scanning, penetration testing, compliance testing
9. **Performance Testing Strategy** - Load testing scenarios, stress testing, performance monitoring, optimization testing
10. **Mobile & Cross-Platform Testing** - Mobile app testing, responsive design testing, PWA testing, cross-platform validation
11. **Automated Testing Implementation** - Test automation framework, CI pipelines, test execution, result analysis
12. **Manual Testing Procedures** - Exploratory testing, UAT procedures, bug reporting, regression testing
13. **Quality Metrics & Reporting** - Quality metrics, test coverage reporting, defect tracking, quality gates
14. **Test Environment Management** - Environment setup, test data provisioning, environment monitoring
15. **Risk Management & Mitigation** - Risk assessment, critical path identification, contingency planning, process improvement
16. **Implementation Examples & Templates** - Test cases, automation scripts, bug report templates, quality checklists

Please provide comprehensive QA and testing specifications with specific tool recommendations, test case examples, and implementation guidelines. Focus on robust, scalable, and maintainable testing strategy.

Format your response with clear sections, test examples where appropriate, and detailed implementation instructions.`,
      isActive: true
    },

    // Stage 4: Go-to-Market
    {
      name: 'BusinessFormationAgent',
      description: 'Creates business formation and legal structure specifications including entity selection, compliance requirements, intellectual property strategy, and regulatory considerations.',
      stage: 4,
      prompt: `You are an expert business formation consultant tasked with creating comprehensive business formation and legal structure specifications for a digital venture.

Your task is to analyze the business concept and create detailed business formation plans that include:

1. **Business Entity Selection** - Corporation, LLC, partnership analysis, tax implications, liability protection
2. **Legal Structure & Governance** - Corporate bylaws, operating agreements, board structure, shareholder agreements
3. **Intellectual Property Strategy** - Trademark registration, copyright protection, patent considerations, trade secrets
4. **Regulatory Compliance** - Industry regulations, licensing requirements, data privacy laws, consumer protection
5. **Business Registration & Licensing** - State registration, federal EIN, business licenses, permits, zoning
6. **Contracts & Agreements** - Terms of service, privacy policy, employment agreements, vendor contracts
7. **Insurance & Risk Management** - Business insurance, professional liability, cyber insurance, risk assessment
8. **Tax Strategy & Planning** - Tax structure optimization, deductions, quarterly payments, accounting methods
9. **Employment & HR Framework** - Employment law compliance, contractor vs employee, equity compensation
10. **International Considerations** - Global expansion, international tax, cross-border compliance, GDPR
11. **Funding & Investment Structure** - Investment agreements, equity structure, securities compliance, fundraising
12. **Exit Strategy Planning** - Acquisition preparation, IPO readiness, valuation considerations, succession planning
13. **Implementation Timeline** - Formation checklist, priority tasks, deadlines, professional service providers
14. **Ongoing Compliance** - Annual requirements, reporting obligations, record keeping, legal maintenance

Please provide comprehensive business formation specifications with specific recommendations, legal considerations, and implementation guidelines. Focus on scalable, compliant, and investor-ready structure.

Format your response with clear sections, actionable checklists, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'MarketingContentAgent',
      description: 'Creates comprehensive marketing content strategy including brand messaging, content marketing, digital marketing campaigns, and customer acquisition strategies.',
      stage: 4,
      prompt: `You are an expert marketing strategist tasked with creating comprehensive marketing content and strategy specifications for a digital venture.

Your task is to analyze the business concept and create detailed marketing plans that include:

1. **Brand Strategy & Messaging** - Brand positioning, value proposition, messaging framework, brand voice and tone
2. **Content Marketing Strategy** - Content pillars, editorial calendar, blog strategy, thought leadership, SEO content
3. **Digital Marketing Channels** - Social media strategy, email marketing, PPC campaigns, influencer marketing
4. **Website & Landing Pages** - Website strategy, conversion optimization, landing page design, user experience
5. **Search Engine Optimization** - Keyword strategy, on-page SEO, technical SEO, local SEO, link building
6. **Social Media Marketing** - Platform strategy, content calendar, community management, social advertising
7. **Email Marketing & Automation** - Email sequences, segmentation, automation workflows, newsletter strategy
8. **Paid Advertising Strategy** - Google Ads, Facebook Ads, LinkedIn Ads, retargeting, budget allocation
9. **Public Relations & Outreach** - PR strategy, media outreach, press releases, industry partnerships
10. **Customer Acquisition Funnel** - Awareness, consideration, conversion, retention, referral strategies
11. **Marketing Analytics & Measurement** - KPIs, attribution modeling, conversion tracking, ROI measurement
12. **Marketing Technology Stack** - CRM integration, marketing automation, analytics tools, attribution platforms
13. **Budget & Resource Planning** - Marketing budget allocation, team structure, agency partnerships, tool costs
14. **Launch Strategy & Campaigns** - Pre-launch, launch, post-launch campaigns, milestone marketing, seasonal campaigns
15. **Content Creation Guidelines** - Brand guidelines, content templates, approval processes, quality standards
16. **Implementation Roadmap** - Campaign timelines, content calendar, resource allocation, success metrics

Please provide comprehensive marketing content and strategy specifications with specific tactics, campaign ideas, and implementation guidelines. Focus on scalable, measurable, and cost-effective marketing approach.

Format your response with clear sections, campaign examples, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'SalesFunnelAgent',
      description: 'Creates sales funnel and customer acquisition strategy including lead generation, conversion optimization, sales process design, and customer retention frameworks.',
      stage: 4,
      prompt: `You are an expert sales strategist tasked with creating comprehensive sales funnel and customer acquisition specifications for a digital venture.

Your task is to analyze the business concept and create detailed sales and conversion strategies that include:

1. **Sales Funnel Architecture** - Awareness, interest, consideration, purchase, retention, advocacy stages
2. **Lead Generation Strategy** - Lead magnets, content offers, webinars, free trials, referral programs
3. **Lead Qualification & Scoring** - Lead scoring models, qualification criteria, MQL/SQL definitions, handoff processes
4. **Conversion Optimization** - Landing page optimization, A/B testing, form optimization, checkout flow
5. **Sales Process Design** - Sales methodology, sales stages, qualification frameworks, objection handling
6. **Customer Onboarding** - Onboarding sequence, user activation, feature adoption, success milestones
7. **Pricing Strategy & Models** - Pricing tiers, freemium models, subscription pricing, value-based pricing
8. **Sales Technology Stack** - CRM selection, sales automation, pipeline management, reporting tools
9. **Customer Retention Strategy** - Churn prevention, upselling, cross-selling, customer success programs
10. **Sales Team Structure** - Sales roles, compensation plans, territory management, performance metrics
11. **Customer Lifecycle Management** - Customer journey mapping, touchpoint optimization, lifecycle campaigns
12. **Sales Analytics & Reporting** - Sales metrics, conversion rates, pipeline analysis, forecasting
13. **Partnership & Channel Strategy** - Channel partnerships, affiliate programs, reseller networks, strategic alliances
14. **Customer Support Integration** - Support-to-sales handoffs, customer feedback loops, satisfaction surveys
15. **Competitive Positioning** - Competitive analysis, differentiation strategy, objection handling, win/loss analysis
16. **Implementation & Optimization** - Funnel testing, performance monitoring, continuous improvement, scaling strategies

Please provide comprehensive sales funnel and customer acquisition specifications with specific tactics, process flows, and implementation guidelines. Focus on scalable, measurable, and high-converting sales approach.

Format your response with clear sections, process diagrams described in text, and detailed implementation instructions.`,
      isActive: true
    },

    // Stage 5: Operations
    {
      name: 'CustomerSupportAgent',
      description: 'Creates customer support and service framework including support processes, knowledge management, customer success programs, and service quality standards.',
      stage: 5,
      prompt: `You are an expert customer success strategist tasked with creating comprehensive customer support and service specifications for a digital venture.

Your task is to analyze the business concept and create detailed customer support frameworks that include:

1. **Customer Support Strategy** - Support philosophy, service standards, response time goals, quality metrics
2. **Support Channel Management** - Omnichannel support, email, chat, phone, social media, self-service
3. **Knowledge Management System** - Knowledge base, FAQ, documentation, video tutorials, troubleshooting guides
4. **Support Process Design** - Ticket routing, escalation procedures, priority levels, resolution workflows
5. **Customer Success Programs** - Onboarding, health scoring, proactive outreach, renewal management
6. **Support Team Structure** - Team roles, skill requirements, training programs, performance management
7. **Support Technology Stack** - Helpdesk software, CRM integration, knowledge base tools, analytics platforms
8. **Self-Service Solutions** - Help center design, search functionality, community forums, chatbots
9. **Quality Assurance** - Quality monitoring, customer satisfaction surveys, feedback collection, improvement processes
10. **Customer Communication** - Communication templates, tone guidelines, multilingual support, accessibility
11. **Issue Resolution Framework** - Problem categorization, root cause analysis, solution documentation, prevention strategies
12. **Customer Feedback Management** - Feedback collection, analysis, product improvement, feature requests
13. **Support Analytics & Reporting** - Support metrics, customer satisfaction, team performance, trend analysis
14. **Crisis Management** - Incident response, communication protocols, service recovery, reputation management
15. **Continuous Improvement** - Process optimization, training updates, technology upgrades, best practice sharing
16. **Implementation Roadmap** - Support setup, team hiring, training schedule, technology deployment, launch plan

Please provide comprehensive customer support and service specifications with specific processes, templates, and implementation guidelines. Focus on scalable, efficient, and customer-centric support approach.

Format your response with clear sections, process flows, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'AnalyticsAgent',
      description: 'Creates analytics and data intelligence framework including KPI definition, data collection strategy, reporting systems, and business intelligence implementation.',
      stage: 5,
      prompt: `You are an expert data analyst and business intelligence strategist tasked with creating comprehensive analytics and measurement specifications for a digital venture.

Your task is to analyze the business concept and create detailed analytics frameworks that include:

1. **Analytics Strategy & Framework** - Data strategy, measurement philosophy, analytics maturity model, governance
2. **Key Performance Indicators (KPIs)** - Business metrics, operational metrics, customer metrics, financial metrics
3. **Data Collection Strategy** - Event tracking, user behavior, conversion tracking, attribution modeling
4. **Analytics Technology Stack** - Analytics platforms, data warehousing, visualization tools, reporting systems
5. **Data Architecture & Pipeline** - Data sources, ETL processes, data modeling, real-time vs batch processing
6. **Customer Analytics** - User segmentation, cohort analysis, lifetime value, churn prediction, behavior analysis
7. **Product Analytics** - Feature usage, user flows, A/B testing, product performance, adoption metrics
8. **Marketing Analytics** - Campaign performance, attribution, ROI measurement, channel effectiveness, funnel analysis
9. **Financial Analytics** - Revenue tracking, cost analysis, profitability, forecasting, budget variance
10. **Operational Analytics** - Performance monitoring, system health, error tracking, capacity planning
11. **Reporting & Dashboards** - Executive dashboards, operational reports, automated reporting, data visualization
12. **Data Quality & Governance** - Data validation, quality monitoring, privacy compliance, access controls
13. **Advanced Analytics** - Predictive modeling, machine learning, statistical analysis, trend forecasting
14. **Data Privacy & Compliance** - GDPR compliance, data retention, consent management, privacy by design
15. **Team & Skills Development** - Analytics team structure, skill requirements, training programs, tool adoption
16. **Implementation & Rollout** - Analytics setup, tracking implementation, dashboard creation, team training

Please provide comprehensive analytics and measurement specifications with specific metrics, implementation guides, and technology recommendations. Focus on actionable, scalable, and privacy-compliant analytics approach.

Format your response with clear sections, metric definitions, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'FinancialManagementAgent',
      description: 'Creates financial management and planning framework including budgeting, forecasting, financial controls, funding strategy, and performance monitoring.',
      stage: 5,
      prompt: `You are an expert financial strategist tasked with creating comprehensive financial management and planning specifications for a digital venture.

Your task is to analyze the business concept and create detailed financial frameworks that include:

1. **Financial Strategy & Planning** - Financial objectives, capital structure, growth strategy, risk management
2. **Budgeting & Forecasting** - Operating budgets, cash flow forecasts, scenario planning, variance analysis
3. **Revenue Model & Pricing** - Revenue streams, pricing strategy, subscription models, monetization optimization
4. **Cost Management** - Cost structure analysis, expense categorization, cost optimization, vendor management
5. **Cash Flow Management** - Working capital, cash flow projections, payment terms, liquidity management
6. **Financial Controls & Processes** - Approval workflows, expense policies, procurement processes, audit trails
7. **Accounting & Bookkeeping** - Chart of accounts, accounting methods, transaction recording, reconciliation
8. **Financial Reporting** - P&L statements, balance sheets, cash flow statements, management reports
9. **Tax Planning & Compliance** - Tax strategy, compliance requirements, deductions, quarterly filings
10. **Funding & Investment** - Funding requirements, investor relations, equity management, debt financing
11. **Financial Technology Stack** - Accounting software, payment processing, expense management, reporting tools
12. **Performance Metrics** - Financial KPIs, unit economics, customer metrics, operational efficiency
13. **Risk Management** - Financial risks, insurance coverage, hedging strategies, contingency planning
14. **Investor Relations** - Investor reporting, board materials, fundraising materials, due diligence preparation
15. **Financial Team Structure** - Roles and responsibilities, skill requirements, outsourcing vs in-house
16. **Implementation Timeline** - Financial setup, system implementation, process establishment, team building

Please provide comprehensive financial management specifications with specific processes, templates, and implementation guidelines. Focus on scalable, compliant, and investor-ready financial framework.

Format your response with clear sections, financial templates, and detailed implementation instructions.`,
      isActive: true
    },

    // Stage 6: Self-Improvement
    {
      name: 'ContinuousMonitoringAgent',
      description: 'Creates continuous monitoring and observability framework including system monitoring, performance tracking, alerting systems, and operational intelligence.',
      stage: 6,
      prompt: `You are an expert DevOps and monitoring strategist tasked with creating comprehensive continuous monitoring and observability specifications for a digital venture.

Your task is to analyze the system requirements and create detailed monitoring frameworks that include:

1. **Monitoring Strategy & Philosophy** - Observability principles, monitoring objectives, SLA/SLO definition, incident response
2. **System Monitoring** - Infrastructure monitoring, application performance, database monitoring, network monitoring
3. **Application Performance Monitoring (APM)** - Response times, error rates, throughput, user experience monitoring
4. **Log Management & Analysis** - Centralized logging, log aggregation, log analysis, structured logging
5. **Alerting & Notification Systems** - Alert rules, escalation procedures, notification channels, alert fatigue prevention
6. **Metrics & KPIs** - Technical metrics, business metrics, custom metrics, metric aggregation and analysis
7. **Dashboards & Visualization** - Real-time dashboards, executive dashboards, operational views, custom visualizations
8. **Incident Management** - Incident detection, response procedures, post-mortem analysis, continuous improvement
9. **Capacity Planning** - Resource utilization, growth projections, scaling triggers, performance optimization
10. **Security Monitoring** - Security events, threat detection, compliance monitoring, vulnerability scanning
11. **User Experience Monitoring** - Real user monitoring, synthetic monitoring, performance budgets, Core Web Vitals
12. **Business Intelligence** - Business metrics, customer behavior, revenue tracking, operational efficiency
13. **Monitoring Technology Stack** - Monitoring tools, observability platforms, alerting systems, visualization tools
14. **Data Retention & Storage** - Metric retention, log retention, data archiving, storage optimization
15. **Team & Processes** - On-call procedures, runbooks, training programs, knowledge sharing
16. **Implementation & Rollout** - Monitoring setup, tool deployment, team training, process establishment

Please provide comprehensive monitoring and observability specifications with specific tools, metrics, and implementation guidelines. Focus on proactive, scalable, and actionable monitoring approach.

Format your response with clear sections, monitoring examples, and detailed implementation instructions.`,
      isActive: true
    },

    {
      name: 'OptimizationAgent',
      description: 'Creates optimization and improvement framework including performance optimization, process improvement, A/B testing, and continuous enhancement strategies.',
      stage: 6,
      prompt: `You are an expert optimization strategist tasked with creating comprehensive optimization and continuous improvement specifications for a digital venture.

Your task is to analyze the business and technical systems and create detailed optimization frameworks that include:

1. **Optimization Strategy & Framework** - Optimization philosophy, improvement methodology, success metrics, prioritization
2. **Performance Optimization** - System performance, application optimization, database tuning, infrastructure scaling
3. **User Experience Optimization** - UX improvements, conversion optimization, user journey enhancement, accessibility
4. **Process Optimization** - Business process improvement, workflow automation, efficiency gains, waste reduction
5. **A/B Testing & Experimentation** - Testing framework, experiment design, statistical analysis, result interpretation
6. **Conversion Rate Optimization** - Funnel optimization, landing page testing, checkout optimization, form optimization
7. **Technical Optimization** - Code optimization, architecture improvements, security enhancements, scalability improvements
8. **Cost Optimization** - Infrastructure costs, operational efficiency, vendor optimization, resource utilization
9. **Customer Experience Optimization** - Customer journey improvement, support optimization, satisfaction enhancement
10. **Marketing Optimization** - Campaign optimization, channel effectiveness, attribution improvement, ROI enhancement
11. **Data-Driven Decision Making** - Analytics-driven optimization, data collection, insight generation, action planning
12. **Continuous Improvement Culture** - Improvement processes, team engagement, knowledge sharing, innovation programs
13. **Optimization Tools & Technology** - Testing platforms, analytics tools, optimization software, automation tools
14. **Measurement & Reporting** - Optimization metrics, improvement tracking, ROI measurement, success reporting
15. **Risk Management** - Optimization risks, testing safety, rollback procedures, impact assessment
16. **Implementation Roadmap** - Optimization priorities, testing schedule, improvement timeline, resource allocation

Please provide comprehensive optimization and improvement specifications with specific strategies, testing approaches, and implementation guidelines. Focus on data-driven, systematic, and sustainable optimization approach.

Format your response with clear sections, optimization examples, and detailed implementation instructions.`,
      isActive: true
    }
  ];

  for (const agentData of agents) {
    try {
      // Check if agent already exists
      const prisma = databaseService.getClient();
      const existingAgent = await prisma.agent.findUnique({
        where: { name: agentData.name }
      });

      if (existingAgent) {
        console.log(`⚠️  Agent ${agentData.name} already exists, updating...`);
        await prisma.agent.update({
          where: { name: agentData.name },
          data: {
            description: agentData.description,
            stage: agentData.stage,
            prompt: agentData.prompt,
            isActive: agentData.isActive
          }
        });
      } else {
        console.log(`➕ Creating agent: ${agentData.name}`);
        await prisma.agent.create({
          data: agentData
        });
      }
    } catch (error) {
      console.error(`❌ Failed to seed agent ${agentData.name}:`, error);
      throw error;
    }
  }

  console.log(`✅ Successfully seeded ${agents.length} agents`);
}

/**
 * Seeds test data for development purposes.
 */
async function seedTestData() {
  console.log('🧪 Seeding test data...');
  
  try {
    const prisma = databaseService.getClient();
    
    // Create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com'
      }
    });

    console.log(`✅ Test user created/updated: ${testUser.id}`);

    // Create a test project
    const testProject = await prisma.project.upsert({
      where: { id: 'test-project-1' },
      update: {},
      create: {
        id: 'test-project-1',
        name: 'AI Task Manager',
        idea: 'An AI-powered task management app that helps users prioritize and organize their daily tasks more efficiently using machine learning algorithms.',
        userId: testUser.id,
        status: 'CREATED',
        currentStage: 1
      }
    });

    console.log(`✅ Test project created/updated: ${testProject.id}`);

  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
}

// Run seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const includeTestData = args.includes('--test-data');

  seedDatabase()
    .then(async () => {
      if (includeTestData) {
        await seedTestData();
      }
    })
    .catch((error) => {
      console.error('❌ Unexpected error during database seeding:', error);
      process.exit(1);
    });
}

/**
 * Seeds a default user for testing and development.
 */
async function seedDefaultUser() {
  console.log('👤 Seeding default user...');
  
  const prisma = databaseService.getClient();
  
  try {
    // Check if default user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'user_123' }
    });

    if (existingUser) {
      console.log('ℹ️  Default user already exists, skipping...');
      return;
    }

    // Create default user
    const user = await prisma.user.create({
      data: {
        id: 'user_123',
        email: 'demo@example.com'
      }
    });

    console.log('✅ Default user created:', user.id);
    
  } catch (error) {
    console.error('❌ Failed to seed default user:', error);
    throw error;
  }
}

export { seedDatabase, seedAgents, seedTestData, seedDefaultUser };