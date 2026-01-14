import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

// Check for service role key, fallback to anon key if RLS is disabled
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                       process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!process.env.VITE_SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL in .env.local');
  process.exit(1);
}

const supabaseKey = serviceRoleKey || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key in .env.local');
  console.error('Please add either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY to your .env.local file');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.log('⚠️  Using anon key - RLS must be disabled for this to work\n');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  supabaseKey
);

async function createMockAccount() {
  try {
    // Mock account details
    const mockUser = {
      email: 'demo@cleaninbox.com',
      password: 'demo1234',
      firstName: 'Demo',
      lastName: 'User'
    };

    console.log('🔐 Creating mock account...');
    console.log(`   Email: ${mockUser.email}`);
    console.log(`   Password: ${mockUser.password}`);
    console.log('');

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', mockUser.email)
      .single();

    if (existingUser) {
      console.log('⚠️  User already exists! Deleting existing user first...');

      // Delete existing user (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('email', mockUser.email);

      if (deleteError) {
        throw new Error(`Failed to delete existing user: ${deleteError.message}`);
      }
      console.log('✅ Existing user deleted\n');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(mockUser.password, 10);

    // Create user
    console.log('👤 Creating user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email: mockUser.email,
          password_hash: passwordHash,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
        },
      ])
      .select()
      .single();

    if (userError) throw new Error(`Failed to create user: ${userError.message}`);
    console.log(`✅ User created: ${user.id}\n`);

    // Wait a moment for the trigger to create user_stats
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create subscription (Free plan)
    console.log('💳 Creating subscription...');
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: user.id,
          plan: 'Free',
          status: 'active',
          price: 0.00,
          period: 'monthly',
          email_limit: 1000,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
      ])
      .select()
      .single();

    if (subError) {
      console.log(`⚠️  Subscription table not found or error: ${subError.message}`);
      console.log('   Skipping subscription creation\n');
    } else {
      console.log(`✅ Subscription created: ${subscription.plan} plan\n`);
    }

    // Create mock email accounts
    console.log('📧 Creating mock email accounts...');
    const emailAccounts = [
      {
        user_id: user.id,
        email: 'demo@gmail.com',
        provider: 'gmail',
        total_emails: 1523,
        processed_emails: 1200,
        unsubscribed: 87,
        last_synced: new Date().toISOString()
      },
      {
        user_id: user.id,
        email: 'demo@outlook.com',
        provider: 'outlook',
        total_emails: 892,
        processed_emails: 650,
        unsubscribed: 45,
        last_synced: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .insert(emailAccounts)
      .select();

    if (accountsError) throw new Error(`Failed to create email accounts: ${accountsError.message}`);
    console.log(`✅ Created ${accounts.length} email accounts\n`);

    // Update user_stats with aggregated data
    console.log('📊 Updating user stats...');
    const totalProcessed = emailAccounts.reduce((sum, acc) => sum + acc.processed_emails, 0);
    const totalUnsubscribed = emailAccounts.reduce((sum, acc) => sum + acc.unsubscribed, 0);

    const { error: statsError } = await supabase
      .from('user_stats')
      .update({
        emails_processed: totalProcessed,
        unsubscribed: totalUnsubscribed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (statsError) throw new Error(`Failed to update stats: ${statsError.message}`);
    console.log(`✅ User stats updated\n`);

    // Success summary
    console.log('🎉 Mock account created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 Account Details:');
    console.log('═══════════════════════════════════════');
    console.log(`Email:     ${mockUser.email}`);
    console.log(`Password:  ${mockUser.password}`);
    console.log(`Plan:      ${subscription ? subscription.plan : 'N/A (table not created)'}`);
    console.log(`Emails:    ${totalProcessed} processed, ${totalUnsubscribed} unsubscribed`);
    console.log(`Accounts:  ${accounts.length} connected email accounts`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating mock account:', error.message);
    process.exit(1);
  }
}

createMockAccount();
