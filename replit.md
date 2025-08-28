# replit.md

## Overview

Blayz is an AI-powered Meta (Facebook) advertising analytics platform built to help agencies and marketers optimize their ad campaigns. The application provides comprehensive campaign analysis, anomaly detection, and actionable recommendations through AI-powered insights. It features a Next.js frontend, FastAPI backend, and Supabase database with real-time capabilities.

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
- **API Layer**: FastAPI with Python for backend services
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Edge Functions**: Supabase Edge Functions for Meta API integration
- **Real-time Features**: Supabase real-time subscriptions for live data updates
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

### AI Analysis System
- **Primary AI**: Google Gemini 2.5 Pro via Requesty API for final analysis
- **Secondary AI**: DeepSeek V3 via Chutes API for intermediate processing
- **Analysis Types**: Campaign performance, anomaly detection, demographic insights
- **Iterative Approach**: Multi-step analysis with specialized prompts for different insights

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