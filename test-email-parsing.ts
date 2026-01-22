/**
 * Comprehensive Email Parsing Test Suite
 * 1000+ test cases to ensure bulletproof email parsing
 * Run with: npx ts-node test-email-parsing.ts
 */

function parseSender(fromHeader: string): { email: string; name: string } {
  const trimmed = fromHeader.trim();

  // Handle empty or invalid input
  if (!trimmed || trimmed === '<>' || trimmed === '""' || trimmed === "''") {
    return { name: '', email: '' };
  }

  // Check for format: Name <email@domain.com> or "Name" <email@domain.com>
  const angleMatch = trimmed.match(/^(?:"?(.+?)"?\s*)?<([^<>]+@[^<>]+)>$/);
  if (angleMatch) {
    return {
      name: (angleMatch[1] || '').trim().replace(/^["']|["']$/g, ''),
      email: angleMatch[2].toLowerCase().trim(),
    };
  }

  // Check for plain email address (no angle brackets, no name)
  const plainEmailMatch = trimmed.match(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (plainEmailMatch) {
    return {
      name: '',
      email: plainEmailMatch[1].toLowerCase().trim(),
    };
  }

  // Fallback: try to extract any email-like pattern
  const emailExtract = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailExtract) {
    // Get the part before the email as the name
    const emailIndex = trimmed.indexOf(emailExtract[1]);
    const namePart = trimmed.substring(0, emailIndex).trim().replace(/[<>"']/g, '').trim();
    return {
      name: namePart,
      email: emailExtract[1].toLowerCase().trim(),
    };
  }

  // Last resort: return the whole thing as email
  return {
    name: '',
    email: trimmed.toLowerCase(),
  };
}

interface TestCase {
  input: string;
  expectedEmail: string;
  expectedName: string;
}

const testCases: TestCase[] = [];

// ============================================================
// SECTION 1: Plain email addresses (no name)
// ============================================================

const domains = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'protonmail.com', 'mail.com', 'aol.com', 'zoho.com', 'yandex.com',
  'example.com', 'test.com', 'company.com', 'business.org', 'school.edu',
  'government.gov', 'military.mil', 'example.co.uk', 'example.com.au',
  'example.de', 'example.fr', 'example.jp', 'example.cn', 'example.br',
  'subdomain.example.com', 'mail.subdomain.example.com',
  'very-long-subdomain-name.example.com',
  'example.photography', 'example.technology', 'example.international',
  'example.construction', 'example.management', 'example.solutions',
  'startup.io', 'company.ai', 'tech.dev', 'app.co', 'site.me',
  'spond.com', 'supabase.com', 'vercel.com', 'railway.app', 'netlify.com',
  'dragonmotorsport.ca', 'costco.ca', 'amazon.ca', 'walmart.com',
];

const usernames = [
  'john', 'jane', 'user', 'admin', 'info', 'contact', 'support', 'help',
  'sales', 'marketing', 'billing', 'noreply', 'no-reply', 'do-not-reply',
  'donotreply', 'notifications', 'alerts', 'updates', 'news', 'newsletter',
  'john.doe', 'jane.smith', 'first.last', 'first.middle.last',
  'john_doe', 'jane_smith', 'first_last',
  'john-doe', 'jane-smith', 'first-last',
  'john123', 'user456', 'test789', '123john', '456user',
  'john+newsletter', 'jane+shopping', 'user+label', 'test+tag',
  'a', 'ab', 'abc', 'x1', 'user1', 'user_1', 'user-1', 'user.1',
  'JOHN', 'JANE', 'USER', 'John', 'Jane', 'User',
  'ant.wilson', 'bob.smith', 'carol.jones', 'david.brown', 'emma.davis',
  'frank.miller', 'grace.wilson', 'henry.moore', 'iris.taylor', 'jack.anderson',
  'costconews', 'amazonorders', 'notifications', 'mailer', 'postmaster',
];

// Generate plain email test cases
for (const domain of domains) {
  for (const username of usernames.slice(0, 20)) { // Limit combinations
    const email = `${username}@${domain}`.toLowerCase();
    testCases.push({
      input: email,
      expectedEmail: email,
      expectedName: '',
    });
    // Also test uppercase
    testCases.push({
      input: email.toUpperCase(),
      expectedEmail: email,
      expectedName: '',
    });
  }
}

// ============================================================
// SECTION 2: Name <email> format
// ============================================================

const names = [
  'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'David', 'Emma', 'Frank',
  'John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown',
  'John Michael Doe', 'Mary Jane Watson', 'Robert James Smith',
  "John O'Brien", "Mary O'Connor", "Patrick O'Malley",
  'José García', 'François Müller', 'Björk Guðmundsdóttir',
  'Dr. John Smith', 'Mr. Bob Jones', 'Mrs. Jane Doe', 'Ms. Alice Brown',
  'John Smith Jr.', 'Robert Jones Sr.', 'William Brown III',
  'Jean-Pierre', 'Mary-Jane', 'Anne-Marie',
  'Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'YouTube',
  'Amazon', 'Netflix', 'Spotify', 'Apple', 'Google',
  'Costco Wholesale', 'Dragon Motorsport', 'Spond', 'Supabase',
  'Bank of America', 'Wells Fargo', 'Chase Bank',
  'Customer Service', 'Support Team', 'Sales Department',
  'The New York Times', 'The Washington Post', 'BBC News',
  'Newsletter', 'Updates', 'Notifications', 'Alerts',
  'Jessica Meloche', 'Thomas Corbeil', 'Football Diablos',
];

// Generate Name <email> test cases
for (const name of names) {
  for (const domain of domains.slice(0, 10)) {
    for (const username of usernames.slice(0, 5)) {
      const email = `${username}@${domain}`.toLowerCase();

      // Standard format: Name <email>
      testCases.push({
        input: `${name} <${email}>`,
        expectedEmail: email,
        expectedName: name,
      });

      // Quoted format: "Name" <email>
      testCases.push({
        input: `"${name}" <${email}>`,
        expectedEmail: email,
        expectedName: name,
      });
    }
  }
}

// ============================================================
// SECTION 3: Edge cases - whitespace
// ============================================================

const whitespaceTests = [
  { input: '  john@example.com  ', expectedEmail: 'john@example.com', expectedName: '' },
  { input: '\tjohn@example.com\t', expectedEmail: 'john@example.com', expectedName: '' },
  { input: '\njohn@example.com\n', expectedEmail: 'john@example.com', expectedName: '' },
  { input: '  John Doe  <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John Doe' },
  { input: 'John Doe <  john@example.com  >', expectedEmail: 'john@example.com', expectedName: 'John Doe' },
  { input: '   John   Doe   <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John   Doe' },
];
testCases.push(...whitespaceTests);

// ============================================================
// SECTION 4: Edge cases - angle brackets only
// ============================================================

for (const domain of domains.slice(0, 20)) {
  for (const username of usernames.slice(0, 10)) {
    const email = `${username}@${domain}`.toLowerCase();
    testCases.push({
      input: `<${email}>`,
      expectedEmail: email,
      expectedName: '',
    });
  }
}

// ============================================================
// SECTION 5: Edge cases - special characters in usernames
// ============================================================

const specialUsernames = [
  'user.name', 'user_name', 'user-name', 'user+tag', 'user%encoded',
  'first.middle.last', 'a.b.c.d.e', 'test.test.test',
  'user+newsletter+2024', 'john+shopping+deals',
  '123.456.789', 'abc.123.xyz',
  'a', 'ab', 'abc', 'a1', '1a', 'a1b2c3',
  'user..double', // Some servers allow this
  'very.long.username.with.many.dots.in.it',
  'CamelCase', 'ALLCAPS', 'lowercase',
];

for (const username of specialUsernames) {
  const email = `${username}@example.com`.toLowerCase();
  testCases.push({
    input: email,
    expectedEmail: email,
    expectedName: '',
  });
  testCases.push({
    input: `Test User <${email}>`,
    expectedEmail: email,
    expectedName: 'Test User',
  });
}

// ============================================================
// SECTION 6: Real-world email formats from popular services
// ============================================================

const realWorldEmails = [
  // Google
  { input: 'noreply@google.com', expectedEmail: 'noreply@google.com', expectedName: '' },
  { input: 'Google <noreply@google.com>', expectedEmail: 'noreply@google.com', expectedName: 'Google' },
  { input: 'Google Alerts <googlealerts-noreply@google.com>', expectedEmail: 'googlealerts-noreply@google.com', expectedName: 'Google Alerts' },

  // Facebook
  { input: 'notification@facebookmail.com', expectedEmail: 'notification@facebookmail.com', expectedName: '' },
  { input: 'Facebook <notification@facebookmail.com>', expectedEmail: 'notification@facebookmail.com', expectedName: 'Facebook' },

  // Amazon
  { input: 'auto-confirm@amazon.com', expectedEmail: 'auto-confirm@amazon.com', expectedName: '' },
  { input: 'Amazon.com <auto-confirm@amazon.com>', expectedEmail: 'auto-confirm@amazon.com', expectedName: 'Amazon.com' },
  { input: 'ship-confirm@amazon.ca', expectedEmail: 'ship-confirm@amazon.ca', expectedName: '' },

  // LinkedIn
  { input: 'messages-noreply@linkedin.com', expectedEmail: 'messages-noreply@linkedin.com', expectedName: '' },
  { input: 'LinkedIn <messages-noreply@linkedin.com>', expectedEmail: 'messages-noreply@linkedin.com', expectedName: 'LinkedIn' },

  // Apple
  { input: 'noreply@email.apple.com', expectedEmail: 'noreply@email.apple.com', expectedName: '' },
  { input: 'Apple <noreply@email.apple.com>', expectedEmail: 'noreply@email.apple.com', expectedName: 'Apple' },

  // Netflix
  { input: 'info@mailer.netflix.com', expectedEmail: 'info@mailer.netflix.com', expectedName: '' },
  { input: 'Netflix <info@mailer.netflix.com>', expectedEmail: 'info@mailer.netflix.com', expectedName: 'Netflix' },

  // Spotify
  { input: 'noreply@spotify.com', expectedEmail: 'noreply@spotify.com', expectedName: '' },
  { input: 'Spotify <noreply@spotify.com>', expectedEmail: 'noreply@spotify.com', expectedName: 'Spotify' },

  // Banks
  { input: 'alerts@notify.bankofamerica.com', expectedEmail: 'alerts@notify.bankofamerica.com', expectedName: '' },
  { input: 'Bank of America <alerts@notify.bankofamerica.com>', expectedEmail: 'alerts@notify.bankofamerica.com', expectedName: 'Bank of America' },

  // Shopping
  { input: 'costconews@digital.costco.ca', expectedEmail: 'costconews@digital.costco.ca', expectedName: '' },
  { input: 'Costco Wholesale <costconews@digital.costco.ca>', expectedEmail: 'costconews@digital.costco.ca', expectedName: 'Costco Wholesale' },

  // Sports apps
  { input: 'noreply@spond.com', expectedEmail: 'noreply@spond.com', expectedName: '' },
  { input: 'Jessica Meloche <noreply@spond.com>', expectedEmail: 'noreply@spond.com', expectedName: 'Jessica Meloche' },
  { input: 'Spond <noreply@spond.com>', expectedEmail: 'noreply@spond.com', expectedName: 'Spond' },
  { input: 'Thomas Corbeil <noreply@spond.com>', expectedEmail: 'noreply@spond.com', expectedName: 'Thomas Corbeil' },

  // Newsletters
  { input: 'newsletter@substackmail.com', expectedEmail: 'newsletter@substackmail.com', expectedName: '' },
  { input: 'The Morning Brew <newsletter@morningbrew.com>', expectedEmail: 'newsletter@morningbrew.com', expectedName: 'The Morning Brew' },

  // Developer tools
  { input: 'noreply@github.com', expectedEmail: 'noreply@github.com', expectedName: '' },
  { input: 'GitHub <noreply@github.com>', expectedEmail: 'noreply@github.com', expectedName: 'GitHub' },
  { input: 'noreply@vercel.com', expectedEmail: 'noreply@vercel.com', expectedName: '' },
  { input: 'Vercel <noreply@vercel.com>', expectedEmail: 'noreply@vercel.com', expectedName: 'Vercel' },
  { input: 'noreply@supabase.com', expectedEmail: 'noreply@supabase.com', expectedName: '' },
  { input: 'noreply@supabase.io', expectedEmail: 'noreply@supabase.io', expectedName: '' },
  { input: 'Supabase <noreply@supabase.io>', expectedEmail: 'noreply@supabase.io', expectedName: 'Supabase' },
  { input: 'hello@notify.railway.app', expectedEmail: 'hello@notify.railway.app', expectedName: '' },
  { input: 'Railway <hello@notify.railway.app>', expectedEmail: 'hello@notify.railway.app', expectedName: 'Railway' },
];
testCases.push(...realWorldEmails);

// ============================================================
// SECTION 7: The specific bugs that were reported
// ============================================================

const bugReports = [
  // The ant.wilson bug
  { input: 'ant.wilson@supabase.com', expectedEmail: 'ant.wilson@supabase.com', expectedName: '' },
  { input: 'ANT.WILSON@SUPABASE.COM', expectedEmail: 'ant.wilson@supabase.com', expectedName: '' },
  { input: 'Ant Wilson <ant.wilson@supabase.com>', expectedEmail: 'ant.wilson@supabase.com', expectedName: 'Ant Wilson' },

  // Similar patterns that could fail
  { input: 'bob.smith@example.com', expectedEmail: 'bob.smith@example.com', expectedName: '' },
  { input: 'first.last@company.org', expectedEmail: 'first.last@company.org', expectedName: '' },
  { input: 'user.name@subdomain.example.com', expectedEmail: 'user.name@subdomain.example.com', expectedName: '' },

  // Emails with multiple dots
  { input: 'a.b.c@example.com', expectedEmail: 'a.b.c@example.com', expectedName: '' },
  { input: 'first.middle.last@example.com', expectedEmail: 'first.middle.last@example.com', expectedName: '' },
  { input: 'x.y.z.w@test.co.uk', expectedEmail: 'x.y.z.w@test.co.uk', expectedName: '' },
];
testCases.push(...bugReports);

// ============================================================
// SECTION 8: International TLDs and domains
// ============================================================

const internationalDomains = [
  'example.co.uk', 'example.com.au', 'example.co.nz', 'example.co.za',
  'example.com.br', 'example.com.mx', 'example.com.ar',
  'example.de', 'example.fr', 'example.it', 'example.es', 'example.nl',
  'example.se', 'example.no', 'example.dk', 'example.fi',
  'example.jp', 'example.cn', 'example.kr', 'example.tw', 'example.hk',
  'example.in', 'example.sg', 'example.my', 'example.th',
  'example.ru', 'example.pl', 'example.cz', 'example.hu',
  'example.ae', 'example.sa', 'example.il',
  'example.ca', 'example.us', 'example.mx',
];

for (const domain of internationalDomains) {
  testCases.push({
    input: `user@${domain}`,
    expectedEmail: `user@${domain}`,
    expectedName: '',
  });
  testCases.push({
    input: `Test User <user@${domain}>`,
    expectedEmail: `user@${domain}`,
    expectedName: 'Test User',
  });
}

// ============================================================
// SECTION 9: New TLDs (longer extensions)
// ============================================================

const newTLDs = [
  'photography', 'technology', 'international', 'construction', 'management',
  'solutions', 'consulting', 'engineering', 'marketing', 'advertising',
  'accountant', 'apartments', 'associates', 'attorney', 'automotive',
  'basketball', 'boutique', 'builders', 'business', 'catering',
  'cleaning', 'clothing', 'community', 'company', 'computer',
  'contractors', 'diamonds', 'directory', 'education', 'electronics',
  'enterprises', 'equipment', 'exchange', 'financial', 'foundation',
  'furniture', 'graphics', 'healthcare', 'holdings', 'industries',
  'institute', 'insurance', 'investments', 'lighting', 'management',
  'marketing', 'photography', 'plumbing', 'productions', 'properties',
  'realestate', 'rentals', 'restaurant', 'services', 'software',
  'supplies', 'support', 'technology', 'training', 'ventures',
];

for (const tld of newTLDs) {
  testCases.push({
    input: `info@company.${tld}`,
    expectedEmail: `info@company.${tld}`,
    expectedName: '',
  });
}

// ============================================================
// SECTION 10: Startup/tech TLDs
// ============================================================

const techTLDs = ['io', 'ai', 'dev', 'app', 'co', 'me', 'so', 'ly', 'gg', 'fm', 'tv', 'cc', 'ws'];

for (const tld of techTLDs) {
  testCases.push({
    input: `hello@startup.${tld}`,
    expectedEmail: `hello@startup.${tld}`,
    expectedName: '',
  });
  testCases.push({
    input: `Startup <hello@startup.${tld}>`,
    expectedEmail: `hello@startup.${tld}`,
    expectedName: 'Startup',
  });
}

// ============================================================
// SECTION 11: Case sensitivity tests
// ============================================================

const caseSensitivityTests = [
  { input: 'JOHN@EXAMPLE.COM', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'John@Example.Com', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'jOhN@eXaMpLe.CoM', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'JOHN DOE <JOHN@EXAMPLE.COM>', expectedEmail: 'john@example.com', expectedName: 'JOHN DOE' },
  { input: 'john doe <JOHN@EXAMPLE.COM>', expectedEmail: 'john@example.com', expectedName: 'john doe' },
];
testCases.push(...caseSensitivityTests);

// ============================================================
// SECTION 12: Empty/malformed inputs
// ============================================================

const emptyTests = [
  { input: '', expectedEmail: '', expectedName: '' },
  { input: '   ', expectedEmail: '', expectedName: '' },
  { input: '<>', expectedEmail: '', expectedName: '' },
  { input: '""', expectedEmail: '', expectedName: '' },
];
testCases.push(...emptyTests);

// ============================================================
// SECTION 13: Unusual but valid formats
// ============================================================

const unusualFormats = [
  { input: 'john@example.com (John Doe)', expectedEmail: 'john@example.com', expectedName: '' },
  { input: '"" <john@example.com>', expectedEmail: 'john@example.com', expectedName: '' },
  { input: "'' <john@example.com>", expectedEmail: 'john@example.com', expectedName: '' },
  { input: '=?UTF-8?Q?John_Doe?= <john@example.com>', expectedEmail: 'john@example.com', expectedName: '=?UTF-8?Q?John_Doe?=' },
];
testCases.push(...unusualFormats);

// ============================================================
// SECTION 14: Generate many random variations
// ============================================================

const firstNames = ['james', 'mary', 'john', 'patricia', 'robert', 'jennifer', 'michael', 'linda', 'william', 'elizabeth', 'david', 'barbara', 'richard', 'susan', 'joseph', 'jessica', 'thomas', 'sarah', 'charles', 'karen'];
const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin'];
const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'company.com', 'example.com', 'mail.com', 'test.org'];

for (let i = 0; i < 200; i++) {
  const first = firstNames[i % firstNames.length];
  const last = lastNames[i % lastNames.length];
  const domain = commonDomains[i % commonDomains.length];

  // first.last@domain.com
  const email1 = `${first}.${last}@${domain}`;
  testCases.push({ input: email1, expectedEmail: email1, expectedName: '' });

  // firstlast@domain.com
  const email2 = `${first}${last}@${domain}`;
  testCases.push({ input: email2, expectedEmail: email2, expectedName: '' });

  // first_last@domain.com
  const email3 = `${first}_${last}@${domain}`;
  testCases.push({ input: email3, expectedEmail: email3, expectedName: '' });

  // First Last <first.last@domain.com>
  const displayName = `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
  testCases.push({
    input: `${displayName} <${email1}>`,
    expectedEmail: email1,
    expectedName: displayName,
  });
}

// ============================================================
// SECTION 15: Numbers and alphanumeric combinations
// ============================================================

for (let i = 0; i < 100; i++) {
  const email = `user${i}@example.com`;
  testCases.push({ input: email, expectedEmail: email, expectedName: '' });

  const email2 = `user.${i}@example.com`;
  testCases.push({ input: email2, expectedEmail: email2, expectedName: '' });

  const email3 = `${i}user@example.com`;
  testCases.push({ input: email3, expectedEmail: email3, expectedName: '' });
}

// ============================================================
// SECTION 16: Plus addressing (Gmail style)
// ============================================================

const plusTags = ['newsletter', 'shopping', 'work', 'personal', 'spam', 'test', 'promo', 'alerts', 'social', 'updates'];

for (const tag of plusTags) {
  const email = `user+${tag}@gmail.com`;
  testCases.push({ input: email, expectedEmail: email, expectedName: '' });
  testCases.push({
    input: `User <user+${tag}@gmail.com>`,
    expectedEmail: email,
    expectedName: 'User',
  });
}

// ============================================================
// SECTION 17: Subdomains
// ============================================================

const subdomains = ['mail', 'email', 'smtp', 'mx', 'newsletter', 'marketing', 'support', 'noreply', 'notifications', 'alerts'];

for (const subdomain of subdomains) {
  const email = `info@${subdomain}.example.com`;
  testCases.push({ input: email, expectedEmail: email, expectedName: '' });
  testCases.push({
    input: `Example <info@${subdomain}.example.com>`,
    expectedEmail: email,
    expectedName: 'Example',
  });
}

// ============================================================
// SECTION 18: Very long emails
// ============================================================

const longUsername = 'verylongusernamethatisunusuallylongbutvalid';
const longEmail = `${longUsername}@example.com`;
testCases.push({ input: longEmail, expectedEmail: longEmail, expectedName: '' });

const veryLongDomain = 'subdomain1.subdomain2.subdomain3.example.com';
const veryLongEmail = `user@${veryLongDomain}`;
testCases.push({ input: veryLongEmail, expectedEmail: veryLongEmail, expectedName: '' });

// ============================================================
// RUN TESTS
// ============================================================

console.log('='.repeat(60));
console.log('COMPREHENSIVE EMAIL PARSING TEST SUITE');
console.log(`Testing ${testCases.length} cases...`);
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;
const failures: { input: string; expected: { email: string; name: string }; got: { email: string; name: string } }[] = [];

for (const testCase of testCases) {
  const result = parseSender(testCase.input);
  const emailMatch = result.email === testCase.expectedEmail;
  const nameMatch = result.name === testCase.expectedName;

  if (emailMatch && nameMatch) {
    passed++;
  } else {
    failed++;
    failures.push({
      input: testCase.input,
      expected: { email: testCase.expectedEmail, name: testCase.expectedName },
      got: result,
    });
  }
}

// Print results
if (failures.length > 0) {
  console.log('FAILURES:');
  console.log('-'.repeat(60));
  for (const failure of failures.slice(0, 50)) { // Show first 50 failures
    console.log(`❌ Input: "${failure.input}"`);
    console.log(`   Expected: email="${failure.expected.email}", name="${failure.expected.name}"`);
    console.log(`   Got:      email="${failure.got.email}", name="${failure.got.name}"`);
    console.log('');
  }
  if (failures.length > 50) {
    console.log(`... and ${failures.length - 50} more failures`);
  }
  console.log('-'.repeat(60));
}

console.log('');
console.log('='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60));
console.log(`Total tests:  ${testCases.length}`);
console.log(`Passed:       ${passed} ✅`);
console.log(`Failed:       ${failed} ${failed > 0 ? '❌' : ''}`);
console.log(`Pass rate:    ${((passed / testCases.length) * 100).toFixed(2)}%`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n⚠️  SOME TESTS FAILED! Fix the parsing before deploying.\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED! Email parsing is solid.\n');
}
