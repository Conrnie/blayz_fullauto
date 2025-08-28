# replit.md

## Overview

Blayz is a fully automated Meta ads management system with AI agents that optimize campaigns automatically. The platform features a 5-step automation wizard and specialized AI agents (Orchestrator, Analytics, Creative, Copy, Scaling) that coordinate to optimize Meta campaigns based on performance data and predefined strategies. Built with Next.js frontend, FastAPI backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 13.5.6 with React 18
- **Styling**: Tailwind CSS with custom dark theme and Material-UI components
- **State Management**: React Context for authentication, local state for components
- **Authentication**: Supabase Auth with OAuth support for Meta/Facebook
- **Deployment**: Netlify with custom domain (blayz.io)

### Backend Architecture
- **API Layer**: FastAPI with Python for backend services (port 8000)
- **Database**: PostgreSQL with connection pooling and Row Level Security (RLS)
- **AI Agents**: Multi-agent system with Orchestrator coordinating specialized agents
- **Error Recovery**: Circuit breakers, retry logic, and health checks
- **Monitoring**: Structured logging, metrics collection, and execution time tracking
- **Authentication**: JWT token validation using Supabase Auth

### Database Design
- **Core Tables**: Users, campaigns, ad_sets, ads, insights tables with demographic/device breakdowns
- **Meta Integration**: `meta_connections` table for storing OAuth tokens
- **Analytics**: Specialized tables for hourly, demographic, and regional insights
- **SQL Functions**: Custom PostgreSQL functions for trend analysis and anomaly detection

### Authentication & Authorization
- **Primary Auth**: Supabase Authentication with email/password
- **OAuth Integration**: Meta/Facebook OAuth for ad account access
- **Token Management**: Long-lived access tokens stored securely in database
- **Authorization**: RLS policies ensuring users only access their own data

### AI Agent System
- **Orchestrator Agent**: Central coordinator analyzing campaigns and activating specialized agents
- **Analytics Agent**: Performance analysis and optimization recommendations
- **Creative Agent**: Ad creative generation and refresh strategies
- **Copy Agent**: Ad copy optimization and A/B testing
- **Scaling Agent**: Budget optimization and campaign scaling
- **Decision Engine**: Configurable thresholds based on strategy (conservative/balanced/aggressive)
- **Validation**: Input validation with Pydantic models ensuring data integrity

## Recent Improvements (August 28, 2025)

### Production-Ready Enhancements
- **Fixed Database Service**: Resolved all indentation errors and implemented connection pooling
- **Added Orchestrator Configuration**: Centralized thresholds with strategy-based profiles (conservative/balanced/aggressive)
- **Input Validation**: Pydantic models for campaign metrics and automation data validation
- **Enhanced Monitoring**: Structured logging with context, metrics collection, and execution time tracking
- **Error Recovery**: Circuit breakers, retry logic with exponential backoff, and health checks
- **Rate Limiting**: Meta API rate limiting to prevent quota exhaustion
- **Connection Pooling**: Async database connection pooling for better performance (10-20 connections)

### Code Quality Improvements
- **Modular Architecture**: Separated concerns into validators, config, monitoring, and recovery modules
- **Type Safety**: Strong typing with Pydantic models and TypeVar generics
- **Async/Await**: Proper async patterns throughout the backend
- **Error Handling**: Comprehensive try-catch blocks with proper logging
- **Documentation**: Added docstrings and inline comments for maintainability

## External Dependencies

### Core Services
- **Supabase**: Database, authentication, real-time subscriptions, and edge functions
- **Netlify**: Frontend hosting and deployment with environment variable management

### AI & Analysis APIs
- **Requesty API**: Primary AI service using Google Gemini 2.5 Pro for campaign analysis
- **Chutes API**: Secondary AI service using DeepSeek V3 for intermediate processing

### Meta Integration
- **Meta Business API**: Campaign data fetching, ad account management
- **Meta OAuth**: User authorization and token management for accessing ad accounts

### Additional Services
- **Google Analytics**: Website tracking and user behavior analysis
- **n8n Webhooks**: Lead tracking and conversion monitoring for landing page interactions

### Development Tools
- **Environment Management**: Environment variables for API keys, database credentials, and service configuration
- **Real-time Updates**: WebSocket connections through Supabase for live data synchronization
- **Error Tracking**: Custom logging with Supabase integration for monitoring and debugging