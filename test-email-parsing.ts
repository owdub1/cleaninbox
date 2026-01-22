/**
 * Test script for email parsing
 * Run with: npx ts-node test-email-parsing.ts
 */

function parseSender(fromHeader: string): { email: string; name: string } {
  const trimmed = fromHeader.trim();

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

// Test cases
const testCases = [
  // Standard formats
  { input: 'john@example.com', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'John Doe <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John Doe' },
  { input: '"John Doe" <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John Doe' },
  { input: '<john@example.com>', expectedEmail: 'john@example.com', expectedName: '' },

  // Emails with special characters
  { input: 'john.doe@example.com', expectedEmail: 'john.doe@example.com', expectedName: '' },
  { input: 'john+tag@example.com', expectedEmail: 'john+tag@example.com', expectedName: '' },
  { input: 'john_doe@example.com', expectedEmail: 'john_doe@example.com', expectedName: '' },
  { input: 'john-doe@example.com', expectedEmail: 'john-doe@example.com', expectedName: '' },

  // The problematic case that was failing
  { input: 'ant.wilson@supabase.com', expectedEmail: 'ant.wilson@supabase.com', expectedName: '' },

  // Names with special characters
  { input: 'John O\'Brien <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John O\'Brien' },
  { input: '"John O\'Brien" <john@example.com>', expectedEmail: 'john@example.com', expectedName: 'John O\'Brien' },

  // International/unusual domains
  { input: 'user@example.co.uk', expectedEmail: 'user@example.co.uk', expectedName: '' },
  { input: 'user@subdomain.example.com', expectedEmail: 'user@subdomain.example.com', expectedName: '' },

  // Real-world examples
  { input: 'noreply@spond.com', expectedEmail: 'noreply@spond.com', expectedName: '' },
  { input: 'Jessica Meloche <noreply@spond.com>', expectedEmail: 'noreply@spond.com', expectedName: 'Jessica Meloche' },
  { input: 'Spond <noreply@spond.com>', expectedEmail: 'noreply@spond.com', expectedName: 'Spond' },
  { input: 'support@dragonmotorsport.ca', expectedEmail: 'support@dragonmotorsport.ca', expectedName: '' },
  { input: 'Dragon Motorsport <support@dragonmotorsport.ca>', expectedEmail: 'support@dragonmotorsport.ca', expectedName: 'Dragon Motorsport' },

  // Edge cases
  { input: '  john@example.com  ', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'JOHN@EXAMPLE.COM', expectedEmail: 'john@example.com', expectedName: '' },
  { input: 'John DOE <JOHN@EXAMPLE.COM>', expectedEmail: 'john@example.com', expectedName: 'John DOE' },

  // Unusual but valid formats
  { input: 'john@example.com (John Doe)', expectedEmail: 'john@example.com', expectedName: '' },
  { input: '"" <john@example.com>', expectedEmail: 'john@example.com', expectedName: '' },

  // Numbers in email
  { input: 'john123@example.com', expectedEmail: 'john123@example.com', expectedName: '' },
  { input: '123john@example.com', expectedEmail: '123john@example.com', expectedName: '' },

  // Long TLDs
  { input: 'user@example.photography', expectedEmail: 'user@example.photography', expectedName: '' },
  { input: 'user@example.technology', expectedEmail: 'user@example.technology', expectedName: '' },

  // Company emails
  { input: 'no-reply@company.com', expectedEmail: 'no-reply@company.com', expectedName: '' },
  { input: 'do_not_reply@company.com', expectedEmail: 'do_not_reply@company.com', expectedName: '' },

  // Gmail style
  { input: 'user+label@gmail.com', expectedEmail: 'user+label@gmail.com', expectedName: '' },

  // Multiple dots
  { input: 'first.middle.last@example.com', expectedEmail: 'first.middle.last@example.com', expectedName: '' },

  // Percent encoding (rare)
  { input: 'user%name@example.com', expectedEmail: 'user%name@example.com', expectedName: '' },
];

console.log('Testing email parsing...\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = parseSender(testCase.input);
  const emailMatch = result.email === testCase.expectedEmail;
  const nameMatch = result.name === testCase.expectedName;

  if (emailMatch && nameMatch) {
    passed++;
    console.log(`✅ PASS: "${testCase.input}"`);
  } else {
    failed++;
    console.log(`❌ FAIL: "${testCase.input}"`);
    console.log(`   Expected: email="${testCase.expectedEmail}", name="${testCase.expectedName}"`);
    console.log(`   Got:      email="${result.email}", name="${result.name}"`);
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed > 0) {
  process.exit(1);
}
