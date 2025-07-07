-- Migration to add enhanced ad set analytics functions
-- Run in supabase database

-- First, add the enhanced comprehensive function
\i detect_adset_anomalies_enhanced.sql

-- Then, add the simplified wrapper function for single-day analysis
\i detect_adset_anomalies_fixed.sql 